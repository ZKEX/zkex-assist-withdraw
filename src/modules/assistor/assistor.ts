import { TransactionReceipt } from 'ethers'
import { ParallelSigner } from 'parallel-signer'
import {
  CHAIN_IDS,
  MAXIMUM_PACK_TX_LIMIT,
  POLLING_LOGS_INTERVAL,
  START_LOG_ID,
  SUBMITTER_PRIVATE_KEY,
} from '../../conf'
import { selectMaxProcessedLogId } from '../../db/query'
import { PublicError, logger } from '../../log'
import { metricStartupProcessCount, updateMetric } from '../../monitor/registry'
import { OrderedRequestStore, populateTransaction } from './parallel'
import {
  EventLog,
  blockConfirmations,
  fetchEventLogs,
  getEventChains,
  getEventProfile,
  getMainContractByChainId,
} from '../scanner/scanner'
import { sleep } from '../../utils/sleep'
import {
  WithdrawalRequestParams,
  compressAddress,
  decodeWithdrawalLog,
  encodeWithdrawData,
  groupingRequestParams,
} from '../../utils/withdrawal'
import { ChainId } from '../../types'
import { getMulticallContracts } from '../../utils/multicall'
import { providerByChainId } from '../../utils/providers'
import { updateWithdrawalHash } from '../explorer/explorer'
import {
  getSupportTokens,
  getTokenDecimals,
  recoveryDecimals,
} from '../../utils/zklink'

export class AssistWithdraw {
  private signers: Record<number, ParallelSigner> = {}
  private offsetId: number = 0 // start log id of fetch new event logs
  private requestStore = new OrderedRequestStore()

  async initSigners(chainIds: ChainId[]) {
    logger.info(`Enabled chain id: ${chainIds}`)
    const chains = getEventChains()
    const multicallContracts = getMulticallContracts()

    for (let k of chainIds) {
      const chainId = Number(k)

      const chainProfile = chains.find((v) => Number(v.chainId) === chainId)

      if (!chainProfile) {
        throw new PublicError(`Can't find chain's profile. ${chainId}`)
      }

      updateMetric(() => {
        metricStartupProcessCount.labels(chainId.toString()).inc(0)
      })

      // zkLink's main contract address for v.chainId
      const mainContract = getMainContractByChainId(chainId)

      const multicallContractAddress = multicallContracts[chainId]

      if (!multicallContractAddress) {
        throw new PublicError(
          `Can't find chain's multicall contract address. ${chainId}`
        )
      }

      this.signers[chainId] = new ParallelSigner(
        SUBMITTER_PRIVATE_KEY,
        providerByChainId(chainId),
        this.requestStore,
        populateTransaction(chainId, mainContract, multicallContractAddress),
        {
          requestCountLimit: MAXIMUM_PACK_TX_LIMIT,
          confirmations: blockConfirmations[chainId],
          layer1ChainId: chainId,
          checkConfirmation: async (txReceipt: TransactionReceipt) => {
            try {
              if (!txReceipt) {
                throw new PublicError(`txReceipt is null, chain: ${chainId}`)
              }
              if (!txReceipt?.hash) {
                throw new PublicError(
                  `cannot find hash in txReceipt, chain: ${chainId}`
                )
              }
              updateWithdrawalHash(chainId, txReceipt.hash)
            } catch (e: any) {
              logger.error(e?.message)
              logger.error(e)
            }
          },
        }
      )
      this.signers[chainId].init()

      logger.info(
        `Initial parallel signer for ${chainId}, mainContract=${mainContract}`
      )
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
    const supportTokens = await getSupportTokens()

    const eventProfile = getEventProfile()
    /**
     * Filter out some invalid events:
     * - The main contract configuration for the current event's chain is not found.
     * - The contract address of the current event differs from the configured main contract address.
     */
    logs = logs.filter((v) => {
      const chainInfo = eventProfile.chains[v.chainId][0]
      if (!chainInfo || !chainInfo?.contractAddress) {
        return false
      }
      if (
        v.contractAddress.toLowerCase() !==
        chainInfo.contractAddress.toLowerCase()
      ) {
        return false
      }
      return true
    })

    const withdrawParams: WithdrawalRequestParams[] = []
    for (let i in logs) {
      const decodedData = decodeWithdrawalLog(
        logs[i].log.data,
        logs[i].log.topics
      )
      const { recepient, tokenId, amount } = decodedData

      const decimals = getTokenDecimals(supportTokens, logs[i].chainId, tokenId)
      const recoveryAmount = recoveryDecimals(amount, BigInt(decimals))
      if (amount > 0n && recoveryAmount === 0n) {
        logger.info(
          `Skip the dust amount logs, ${
            logs[i].chainId
          }, ${amount}, ${compressAddress(recepient)}, ${
            logs[i].log.transactionHash
          }`
        )
        continue
      }

      withdrawParams.push({
        ethHash: logs[i].log.transactionHash,
        chainId: logs[i].chainId,
        recepient: compressAddress(recepient),
        tokenId,
        amount,
        logId: logs[i].id,
        logIndex: logs[i].log.logIndex,
        calldata: '',
      })
    }

    return withdrawParams
  }

  async submitTransactions(
    mergedRequests: WithdrawalRequestParams[],
    sourceLogs: EventLog[]
  ) {
    if (mergedRequests?.length) {
      // Group the requestParams data by chainId and then use ParallelSigner to send the data to each chain.
      const groupedRequests = groupingRequestParams(mergedRequests)

      for (let chainId in groupedRequests) {
        const rows = groupedRequests[chainId]
        const txs = rows.map((v) => {
          logger.debug(
            `encode withdraw for chain ${chainId}: ${v.recepient} ${v.tokenId} ${v.amount}`
          )
          return {
            functionData: JSON.stringify({
              ...v,
              tokenId: v.tokenId.toString(), // JSON can not serialize bigint
              amount: v.amount.toString(), // JSON can not serialize bigint
              calldata: encodeWithdrawData(v.recepient, v.tokenId, v.amount),
            }),
            logId: v.logId,
          }
        })

        updateMetric(() => {
          metricStartupProcessCount.labels(chainId.toString()).inc(txs.length)
        })

        // If the layerOneChainId is offline or disabled, only save the requests to db
        if (CHAIN_IDS.includes(Number(chainId)) === false) {
          logger.debug(`Chain ${chainId} is not enabled, only save to requests`)
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

      // await insertProcessedLogs(mergedRequests)
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
      throw new PublicError(
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
    } else if (START_LOG_ID) {
      this.offsetId = START_LOG_ID
    }

    // If there are no records in the table and no starting point is configured, then start from 0.
    if (!this.offsetId) {
      this.offsetId = 0
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
