import { dataSlice, getBytes } from 'ethers'
import { ZKLINK_INTERFACE } from '.'
import { EVENT_NAME } from '../conf'
import { Address, ChainId, HexString } from '../types'

export interface WithdrawalEventParams {
  ethHash: string
  chainId: ChainId
  recepient: Address
  tokenId: number
  amount: bigint
  calldata: string
  logIndex: number
}

export interface WithdrawalRequestParams extends WithdrawalEventParams {
  logId: number // log id, event watcher primary key
}

// 0x3cfb74f0f066330f203d8ac39c3fef52fc056de4d011fc7d91dadd9ba6983416
export const withdrawalEventFragment = ZKLINK_INTERFACE.getEvent(EVENT_NAME)!
export const withdrawalEventTopic = withdrawalEventFragment.topicHash

export function decodeWithdrawalLog(data: HexString, topics: HexString[]) {
  const decodedData = ZKLINK_INTERFACE.decodeEventLog(
    withdrawalEventFragment,
    data,
    topics
  )
  return decodedData
}

// compress the bytes32 address to bytes20
// 0x000000000000000000000000086cacda48e8a77680ba1e79177d1655f7130c95 -> 0x086cacda48e8a77680ba1e79177d1655f7130c95
export function compressAddress(address: HexString) {
  if (getBytes(address).length === 32) {
    return dataSlice(address, 12)
  }
  if (getBytes(address).length === 20) {
    return address
  }
  return address
}

// If the recipient and tokenId of the transactions are the same,
// merge them into a single transaction by summing the amounts,
// and use the larger id from the two transactions as the merged id.
export function mergeEventRequestParams(
  requestParams: WithdrawalRequestParams[]
): WithdrawalRequestParams[] {
  const resultMap: Record<string, WithdrawalRequestParams> = {}

  for (const item of requestParams) {
    const key = `${item.chainId}-${item.recepient}-${item.tokenId}`
    if (resultMap.hasOwnProperty(key)) {
      resultMap[key].amount = resultMap[key].amount + item.amount
      resultMap[key].logId = Math.max(resultMap[key].logId, item.logId)
    } else {
      resultMap[key] = { ...item }
    }
  }

  // the merged event amount should greater than 0
  return Object.values(resultMap).filter((v) => v.amount > 0)
}

// Group the requestParams data by chainId and then use ParallelSigner to send the data to each chain.
export function groupingRequestParams<
  T extends Record<ChainId, WithdrawalRequestParams[]>
>(requestParams: WithdrawalRequestParams[]): T {
  const chainIds = new Set(requestParams.map((v) => v.chainId))
  const result: T = {} as T
  chainIds.forEach((chainId) => {
    result[Number(chainId)] = requestParams.filter(
      (v) => Number(v.chainId) === Number(chainId)
    )
  })

  return result
}

export const fragmentWithdrawPendingBalance = ZKLINK_INTERFACE.getFunction(
  'withdrawPendingBalance'
)!
export function encodeWithdrawData(
  recepient: Address,
  tokenId: number,
  amount: bigint
) {
  return ZKLINK_INTERFACE.encodeFunctionData(fragmentWithdrawPendingBalance, [
    recepient,
    tokenId,
    amount,
  ])
}
export function decodeWithdrawData(calldata: string): {
  recepient: Address
  tokenId: bigint
  amount: bigint
} {
  const data = ZKLINK_INTERFACE.decodeFunctionData(
    fragmentWithdrawPendingBalance,
    calldata
  )
  return {
    recepient: data[0],
    tokenId: data[1],
    amount: data[2],
  }
}
