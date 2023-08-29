import fetch from 'node-fetch'
import { ZKLINK_RPC_ENDPOINT } from '../conf'
import { cache } from './cache'
import { ChainId } from '../types'
import { logger } from '../log'

async function jsonrpc(method: string, params: any[], id: number = 0) {
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
    data = await jsonrpc(method, []).then((r) => r.result)
    cache.set(method, data)
  }
  return data
}

export function getTokenDecimals(
  supportTokens: SupportTokens,
  chainId: ChainId,
  tokenId: number
) {
  try {
    return supportTokens[tokenId].chains[chainId].decimals
  } catch (e: any) {
    logger.error(
      `getTokenDecimals error chainId: ${chainId}, tokenId: ${tokenId}`
    )
    logger.error(JSON.stringify(supportTokens))
    throw new Error(e?.message)
  }
}

export function recoveryDecimals(balance: bigint, decimals: bigint) {
  return balance / 10n ** (18n - decimals)
}
