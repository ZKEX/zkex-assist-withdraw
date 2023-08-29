import { JsonRpcProvider } from 'ethers'
import { ChainId } from '../types'
import { getChains } from '../scanner'

const chainsProvider: Record<ChainId, JsonRpcProvider> = {}

export function providerByChainId(chainId: ChainId) {
  chainId = Number(chainId)

  if (chainsProvider[chainId]) {
    return chainsProvider[chainId]
  }

  const chains = getChains()
  const chain = chains.find((v) => Number(v.chainId) === chainId)
  if (!chain) {
    throw new Error('Cannot find chain info to create provider')
  }
  chainsProvider[chainId] = new JsonRpcProvider(chain.web3Url, {
    name: String(chainId),
    chainId: chainId,
  })
  return chainsProvider[chainId]
}