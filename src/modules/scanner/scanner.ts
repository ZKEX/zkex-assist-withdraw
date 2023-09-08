import { ChainId } from '../../types/index'
import fetch from 'node-fetch'
import '../../conf/index'
import { EVENT_WATCHER_ENDPOINT, POLLING_LOGS_LIMIT } from '../../conf/index'
import {
  Address,
  BlockNumber,
  EventName,
  HexString,
  Topic,
  Wei,
} from '../../types'
import { withdrawalEventTopic } from '../../utils/withdrawal'

async function scannerRpc(method: string, params: any[] = [], id: number = 1) {
  return fetch(EVENT_WATCHER_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({
      id,
      jsonrpc: '2.0',
      method,
      params,
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
  }).then((r) => r.json())
}

export interface EventChainInfo {
  chainId: ChainId
  web3Url: string
  viewBlockStep: number
  secureBlockNumber: number
  requestDelay: number
  requestRetryDelay: number
}
export async function fetchEventChains(): Promise<EventChainInfo[]> {
  return scannerRpc('watcher_getChains').then((r) => r.result)
}

let chains: EventChainInfo[] = []
export async function initEventChains() {
  chains = await fetchEventChains()
}
export function getEventChains() {
  return chains
}

export interface EventProfile {
  name: EventName
  topic: string
  chains: {
    [x: ChainId]: {
      contractAddress: Address
      contractDeploymentBlock: BlockNumber
      secureBlockNumber?: number
    }[]
  }
}
export async function fetchEventProfile(topic: Topic): Promise<EventProfile> {
  return scannerRpc('watcher_getEventProfile', [topic]).then((r) => r.result)
}

let eventProfile: EventProfile
export async function initEventProfile() {
  eventProfile = await fetchEventProfile(withdrawalEventTopic)
}
export function getEventProfile() {
  return eventProfile
}
export function getMainContractByChainId(chainId: ChainId) {
  const eventProfile = getEventProfile()
  const eventChain = eventProfile.chains[chainId][0]
  return eventChain.contractAddress
}

export interface EventLog {
  id: number
  contractAddress: Address
  topic: Topic
  chainId: ChainId
  blockNumber: BlockNumber
  log: {
    data: HexString
    topics: Topic[]
    address: Address
    removed: boolean
    logIndex: number
    blockHash: HexString
    blockNumber: BlockNumber
    transactionHash: HexString
    transactionIndex: number
  }
  createdAt: string
}

export async function fetchEventLogs(
  offsetId: number = 0
): Promise<EventLog[]> {
  return scannerRpc('watcher_getEventLogs', [
    {
      topic: withdrawalEventTopic,
      offsetId,
      limit: POLLING_LOGS_LIMIT,
    },
  ]).then((r) => r.result)
}

export interface GetFeeDataResult {
  chainId: ChainId
  lastBaseFeePerGas: bigint
  standard: {
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    gasPrice?: bigint
  }
  fast: {
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    gasPrice?: bigint
  }
  rapid: {
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    gasPrice?: bigint
  }
}
export async function fetchFeeData(
  chainId: ChainId
): Promise<GetFeeDataResult> {
  return scannerRpc('watcher_getFeeData', [chainId]).then((r) => r.result)
}

export type GetBlockConfirmationsResult = Record<ChainId, number>
export async function fetchBlockConfirmations(): Promise<GetBlockConfirmationsResult> {
  return scannerRpc('watcher_getBlockConfirmations', []).then((r) => r.result)
}

export let blockConfirmations: GetBlockConfirmationsResult
export async function initBlockConfirmations() {
  blockConfirmations = await fetchBlockConfirmations()
}

export async function fetchCountLogs(
  topic: string,
  chainId: ChainId,
  contractAddress: Address,
  logId: number
): Promise<number> {
  return scannerRpc('watcher_countLogs', [
    topic,
    chainId,
    contractAddress,
    logId,
  ]).then((r) => r.result)
}
