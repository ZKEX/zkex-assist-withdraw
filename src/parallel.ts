import { BigNumber } from 'ethers'
import {
  IOrderedRequestStore,
  PackedTransaction,
  Request,
} from 'parallel-signer'
import { SUBMITTER_FEE_POLICY, SUBMITTER_GAS_LIMIT } from './conf'
import { pool } from './db'
import { fetchFeeData } from './scanner'
import { Address, ChainId, Wei } from './types'
import { MULTICALL_INTERFACE } from './utils'
import { decodeWithdrawData } from './utils/withdrawal'

/**
 * Assembling TransactionRequest data for sending the transaction.
 *
 * @export
 * @param {ChainId} chainId web3 chain id
 * @param {Address} mainContract zkLink's main contract address
 * @returns
 */
export function populateTransaction(
  chainId: ChainId,
  mainContract: Address,
  multipleContract: Address
) {
  return async function (requests: Request[]): Promise<{
    to: string
    data: string
    value?: BigNumber
    gasLimit: BigNumber
    maxFeePerGas?: string
    maxPriorityFeePerGas?: string
    gasPrice?: string
  }> {
    let to = ''
    let calldata = ''
    if (requests.length > 1) {
      to = multipleContract // multiple sender contract address
      const recepients: Address[] = []
      const tokenIds: number[] = []
      const amounts: BigNumber[] = []

      requests.forEach((r) => {
        const d = decodeWithdrawData(r.functionData)
        recepients.push(d.recepient)
        tokenIds.push(d.tokenId)
        amounts.push(d.amount)
      })
      const fragment = MULTICALL_INTERFACE.getFunction(
        'batchWithdrawPendingBalance'
      )
      calldata = MULTICALL_INTERFACE.encodeFunctionData(fragment, [
        recepients,
        tokenIds,
        amounts,
      ])
    }
    // If the current 'requests' queue contains only one entry, then send the transaction directly to 'mainContract'.
    else if (requests.length === 1) {
      to = mainContract
      calldata = requests[0].functionData
    } else {
    }

    // Retrieve the latest fee configuration through the event watcher service.
    const feeData = await fetchFeeData(chainId)
    const fee: {
      maxFeePerGas?: Wei
      maxPriorityFeePerGas?: Wei
      gasPrice?: Wei
    } = {}
    // Prioritize using the EIP-1559 fee settings.
    if (
      feeData[SUBMITTER_FEE_POLICY].maxFeePerGas &&
      BigNumber.from(feeData[SUBMITTER_FEE_POLICY].maxFeePerGas).gt('0')
    ) {
      fee.maxFeePerGas = feeData[SUBMITTER_FEE_POLICY].maxFeePerGas
      fee.maxPriorityFeePerGas =
        feeData[SUBMITTER_FEE_POLICY].maxPriorityFeePerGas
    } else {
      fee.gasPrice = feeData[SUBMITTER_FEE_POLICY].gasPrice
    }

    return {
      to,
      data: calldata,
      value: BigNumber.from('0'),
      gasLimit: BigNumber.from(SUBMITTER_GAS_LIMIT).mul(requests.length),
      ...fee,
    }
  }
}

export class OrderedRequestStore implements IOrderedRequestStore {
  async setRequests(requests: Request[]) {
    const result: number[] = []
    for (let v of requests) {
      const r = await pool.query(
        `
          INSERT INTO requests
            (function_data, tx_id, chain_id, log_id)
          VALUES
            ('${v.functionData}', '', ${v.chainId}, ${v.logId})
          RETURNING id;
        `
      )
      result.push(r.rows[0].id)
    }

    return result
  }
  // Get requests where id >= minimalId order by asc??
  async getRequests(
    chainId: number,
    minimalId: number,
    limit: number
  ): Promise<Request[]> {
    const r = await pool.query(`
        SELECT * FROM requests
        WHERE chain_id = ${chainId}  and  id >=  ${minimalId} limit ${limit}
      `)
    return r.rows.map((v) => {
      return buildRequest(v)
    })
  }

  async updateRequestBatch(ids: number[], txid: string) {
    const sql = `
    UPDATE requests
      SET tx_id = '${txid}' WHERE id in (${ids.join(',')})
  `
    await pool.query(sql)
  }

  // Insert packed transaction into the database
  async setPackedTransaction(tx: PackedTransaction) {
    const r = await pool.query(
      `
          INSERT INTO packed_transactions
            (nonce, tx_id, chain_id, gas_price, max_fee_per_gas, max_priority_fee_per_gas, request_ids, confirmation)
          VALUES
            (${tx.nonce}, '${tx.transactionHash}' , ${tx.chainId}, '${tx.gasPrice}', '${tx.maxFeePerGas}', '${tx.maxPriorityFeePerGas}', '${tx.requestIds}', ${tx.confirmation})
          RETURNING id;
        `
    )
    return r.rows[0].id
  }

  // Get the latest packed transaction inserted into the database, max(id)
  async getLatestPackedTransaction(
    chainId: number,
    nonce?: number
  ): Promise<PackedTransaction | null> {
    const sql = [
      `
        SELECT
          *
        FROM packed_transactions
        WHERE`,
    ]
    if (!chainId) {
      throw new Error('Missing chainId in getLatestPackedTransaction')
    }
    sql.push(`chain_id=${chainId}`)
    if (nonce !== undefined) {
      sql.push(`AND nonce=${nonce}`)
    }
    sql.push(`ORDER BY id DESC LIMIT 1;`)
    const latestPackedTx = await pool.query(sql.join(' '))
    console.log(
      '🚀 ~ getLatestPackedTransaction:',
      chainId,
      nonce,
      JSON.stringify(latestPackedTx.rows)
    )
    if (latestPackedTx.rows.length === 0) {
      return null
    }
    return buildPackedTransaction(latestPackedTx.rows[0])
  }

  // Get all packed transactions matching the given nonce and chainId
  async getPackedTransaction(
    nonce: number,
    chainId: number
  ): Promise<PackedTransaction[]> {
    const r = await pool.query(`
        SELECT
          *
        FROM packed_transactions
        WHERE
          chain_id=${chainId}
          AND nonce=${nonce}
      `)
    return r.rows.map((v) => {
      return buildPackedTransaction(v)
    })
  }
  // Return the most recent data that is less than maxId
  async getMaxIDPackedTransaction(
    chainId: number,
    maxId: number
  ): Promise<PackedTransaction | null> {
    const r = await pool.query(
      `
        SELECT
          *
        FROM packed_transactions
        WHERE
          id < ${maxId}
          AND chain_id=${chainId}
        ORDER BY ID DESC
        LIMIT 1
      `
    )
    if (r.rows.length === 0) {
      return null
    }
    return buildPackedTransaction(r.rows[0])
  }

  async setPackedTransactionConfirmation(id: number, confirmation: number) {
    const sql = `
      UPDATE packed_transactions
      SET confirmation='${confirmation}'
      WHERE id=${id}
  `
    await pool.query(sql)
  }

  //only for test
  async getAllPackedTransaction(chainId: number): Promise<PackedTransaction[]> {
    const r = await pool.query(`
        SELECT
          *
        FROM packed_transactions
        WHERE
          chain_id=${chainId}
      `)
    return r.rows.map((v) => {
      return buildPackedTransaction(v)
    })
  }
}

function buildRequest(obj: {
  id: number
  function_data: string
  tx_id: string
  chain_id: number
  log_id: number
  created_at: string
}): Request {
  return {
    id: obj.id,
    functionData: obj.function_data,
    txId: obj.tx_id,
    chainId: obj.chain_id,
    logId: obj.log_id,
    createdAt: new Date(obj.created_at).getTime(),
  } as Request
}

function buildPackedTransaction(obj: {
  id: number
  nonce: number
  tx_id: string
  chain_id: number
  max_fee_per_gas: string
  max_priority_fee_per_gas: string
  gas_price: string
  request_ids: string
  confirmation: number
  created_at: string
  created_time: number
}): PackedTransaction {
  return {
    id: obj.id,
    nonce: obj.nonce,
    transactionHash: obj.tx_id,
    chainId: obj.chain_id,
    maxFeePerGas: obj.max_fee_per_gas,
    maxPriorityFeePerGas: obj.max_priority_fee_per_gas,
    gasPrice: obj.gas_price,
    requestIds: obj.request_ids.split(',').map(Number),
    confirmation: obj.confirmation,
    createdAt: new Date(obj.created_at).getTime(),
  } as PackedTransaction
}
