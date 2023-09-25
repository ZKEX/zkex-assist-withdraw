import fetch from 'node-fetch'
import { ZKLINK_RPC_ENDPOINT } from '../conf'
import { cache } from './cache'
import { Address, ChainId, L2ChainId } from '../types'
import { PublicError, logger } from '../log'
import { ZKLINK_STARKNET_CHAINID } from '../conf'

async function zklinkRpc(method: string, params: any[], id: number = 0) {
  return fetch(`${ZKLINK_RPC_ENDPOINT}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id,
    }),
  }).then((r) => r.json())
}

export interface SupportTokens {
  [tokenId: number]: {
    id: number
    symbol: string
    chains: {
      [chainId: ChainId]: {
        decimals: number
      }
    }
  }
}
export async function getSupportTokens(): Promise<SupportTokens> {
  const method = 'getSupportTokens'
  let data = cache.get(method) as SupportTokens
  if (data === undefined) {
    data = await zklinkRpc(method, []).then((r) => r.result)
    cache.set(method, data)
  }
  return data
}

export type SupportChains = {
  chainId: L2ChainId
  layerOneChainId: ChainId
  mainContract: Address
}[]
export async function getSupportChains(): Promise<SupportChains> {
  const method = 'getSupportChains'
  let data = cache.get(method) as SupportChains
  if (data === undefined) {
    data = await zklinkRpc(method, []).then((r) => r.result)
    const chains = data.map((v) => {
      if (Number(v.chainId) != Number(ZKLINK_STARKNET_CHAINID)) {
        v.layerOneChainId = Number(v.layerOneChainId)
      }
      return v
    })
    cache.set(method, chains)
  }
  return data
}

export function getTokenDecimals(
  supportTokens: SupportTokens,
  chainId: ChainId,
  tokenId: number
) {
  try {
    const chains = cache.get('getSupportChains') as SupportChains
    const chain = chains.find(
      (v) => Number(v.layerOneChainId) === Number(chainId)
    )
    if (!chain) {
      throw new PublicError(`Cannot find layer2 chain id by ${chainId}`)
    }
    return supportTokens[tokenId].chains[chain.chainId].decimals
  } catch (e: any) {
    logger.error(
      `getTokenDecimals error chainId: ${chainId}, tokenId: ${tokenId}`
    )
    throw new PublicError(e?.message)
  }
}

export function recoveryDecimals(balance: bigint, decimals: bigint) {
  return balance / 10n ** (18n - decimals)
}
