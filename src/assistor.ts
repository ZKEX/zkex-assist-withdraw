import { JsonRpcProvider } from 'ethers'
import { ParallelSigner } from 'parallel-signer'
import {
  CHAIN_IDS,
  MAXIMUM_PACK_TX_LIMIT,
  POLLING_LOGS_INTERVAL,
  SUBMITTER_PRIVATE_KEY,
} from './conf'
import { insertProcessedLogs, selectMaxProcessedLogId } from './db/process'
import { logger } from './log'
import { metricStartupProcessCount, updateMetric } from './monitor/registry'
import { OrderedRequestStore, populateTransaction } from './parallel'
import {
  EventLog,
  blockConfirmations,
  fetchChains,
  fetchEventLogs,
  getEventProfile,
} from './scanner'
import { sleep } from './utils/sleep'
import {
  WithdrawalRequestParams,
  compressAddress,
  decodeWithdrawalLog,
  encodeWithdrawData,
  groupingRequestParams,
  mergeEventRequestParams,
} from './utils/withdrawal'
import { ChainId } from './types'
import { getMulticallContracts } from './utils/multicall'

export class AssistWithdraw {
  private signers: Record<number, ParallelSigner> = {}
  private offsetId: number = 0 // start log id of fetch new event logs
  private requestStore = new OrderedRequestStore()

  async initSigners(chainIds: ChainId[]) {
    const chains = await fetchChains()
    const eventProfile = getEventProfile()
    const multicallContracts = getMulticallContracts()
    for (let k of chainIds) {
      const chainId = Number(k)

      updateMetric(() => {
        metricStartupProcessCount.labels(chainId.toString()).inc(0)
      })

      const eventChain = eventProfile.chains[chainId][0]
      const chainProfile = chains.find((v) => Number(v.chainId) === chainId)

      if (!chainProfile) {
        throw new Error(`Can't find chain's profile. ${chainId}`)
      }
      const { web3Url } = chainProfile
      // zkLink's main contract address for v.chainId
      const mainContract = eventChain.contractAddress
      const multicallContractAddress = multicallContracts[chainId]

      if (!multicallContractAddress) {
        throw new Error(
          `Can't find chain's multicall contract address. ${chainId}`
        )
      }

      this.signers[chainId] = new ParallelSigner(
        SUBMITTER_PRIVATE_KEY,
        new JsonRpcProvider(web3Url, {
          name: '',
          chainId: chainId,
        }),
        this.requestStore,
        populateTransaction(chainId, mainContract, multicallContractAddress),
        {
          requestCountLimit: MAXIMUM_PACK_TX_LIMIT,
          confirmations: blockConfirmations[chainId],
        }
      )
      this.signers[chainId].init()
    }
  }

  /**
   * search for the largest processed log id in db
   *
   * @returns
   * @memberof AssistWithdraw
   */
  async queryStoredLargestId() {
    const r = await selectMaxProcessedLogId()
    return r.rows[0].logId
  }

  /**
   * Decode source log data and parse into request parameter format.
   *
   * @private
   * @param {EventLog[]} logs
   * @returns {Promise<WithdrawalRequestParams[]>}
   * @memberof AssistWithdraw
   */
  private async parseLogs(
    logs: EventLog[]
  ): Promise<WithdrawalRequestParams[]> {
    if (!logs?.length) return []

    const withdrawParams: WithdrawalRequestParams[] = []
    for (let i in logs) {
      const decodedData = decodeWithdrawalLog(
        logs[i].log.data,
        logs[i].log.topics
      )
      const { recepient, tokenId, amount } = decodedData

      withdrawParams.push({
        chainId: logs[i].chainId,
        recepient: compressAddress(recepient),
        tokenId,
        amount,
        logId: logs[i].id,
      })
    }

    return mergeEventRequestParams(withdrawParams)
  }

  async submitTransactions(
    mergedRequests: WithdrawalRequestParams[],
    sourceLogs: EventLog[]
  ) {
    if (mergedRequests?.length) {
      // Group the requestParams data by chainId and then use ParallelSigner to send the data to each chain.
      const groupedRequests = groupingRequestParams(mergedRequests)

      for (let chainId in groupedRequests) {
        const txs = groupedRequests[chainId].map((v) => {
          logger.debug(
            `encode withdraw data: ${v.recepient} ${v.tokenId} ${v.amount}`
          )
          return {
            functionData: encodeWithdrawData(v.recepient, v.tokenId, v.amount),
            logId: v.logId,
          }
        })

        // logger.debug(`Send txs: ${JSON.stringify(txs)}`)

        updateMetric(() => {
          metricStartupProcessCount.labels(chainId.toString()).inc(txs.length)
        })

        // If the layerOneChainId is offline or disabled, only save the requests to db
        if (CHAIN_IDS.includes(Number(chainId)) === false) {
          this.requestStore.setRequests(
            txs.map((v) => ({
              ...v,
              chainId: Number(chainId),
            }))
          )
        } else {
          this.signers[chainId].sendTransactions(txs)
        }
      }

      await insertProcessedLogs(mergedRequests)
    }

    // Why is the maximum value taken from the IDs in sourceLogs?
    //
    // It is because the amounts in sourceLogs could all be 0, and in such a case,
    // the mergedRequests would be an empty array as the entries with amount 0 are filtered out.
    // However, the offsetId still needs to be incremented to continue the process.
    // Therefore, the maximum value from the IDs in sourceLogs is used.
    const maxLogId = Math.max(...sourceLogs.map((v) => Number(v.id)))
    this.updateOffsetId(maxLogId)
  }

  // The offsetId used in the query interface of the block scanning service employs an inclusive condition,
  // for instance, offsetId >= 1.
  // Therefore, when performing the next block scan, it needs to be incremented by 1.
  async updateOffsetId(lastLogId: number) {
    lastLogId = Number(lastLogId)
    if (Number.isInteger(lastLogId) === false) {
      throw new Error(
        `update current log id fail, log id is not a integer, logId: ${lastLogId}`
      )
    }
    this.offsetId = lastLogId + 1
  }

  async restoreOffsetId() {
    const offsetId = await this.queryStoredLargestId()
    // After the service maintenance or abnormal restart,
    // it is necessary to query the last processed log ID from the database and continue the task from that point.
    if (offsetId > 0) {
      this.updateOffsetId(offsetId)
    }
    // When there are no records in the database, the query result should be null.
    // In this case, use offsetId=0 to start the task from the beginning of the log service.
    else if (offsetId === null) {
      this.offsetId = 0
    } else {
      throw new Error(`Resore offset id fail, offset: ${offsetId}`)
    }
  }

  async watchNewEventLogs() {
    await this.restoreOffsetId()

    while (true) {
      const rows = await fetchEventLogs(this.offsetId)
      if (rows.length) {
        const withdrawParams = await this.parseLogs(rows)

        await this.submitTransactions(withdrawParams, rows)
      }
      await sleep(POLLING_LOGS_INTERVAL)
    }
  }
}
