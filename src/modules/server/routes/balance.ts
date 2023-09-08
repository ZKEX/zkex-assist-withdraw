import { Request, Response } from 'express'
import { logger } from '../../../log'
import { Address, ChainId } from '../../../types'
import { providerByChainId } from '../../../utils/providers'
import {
  MULTICALL_INTERFACE,
  ZKLINK_ABI,
  ZKLINK_INTERFACE,
} from '../../../utils'
import { extendAddress } from '../../../utils/withdrawal'
import {
  getSupportChains,
  getSupportTokens,
  recoveryDecimals,
} from '../../../utils/zklink'
import {
  callMulticall,
  getMulticallContractByChainId,
} from '../../../utils/multicall'

export interface RequestsBody {
  chainId: ChainId
  account: Address
}

async function batchGetPendingBalance(chainId: ChainId, account: Address) {
  const supportChains = await getSupportChains()
  const supportTokens = await getSupportTokens()
  const multicall = getMulticallContractByChainId(chainId)

  const provider = providerByChainId(chainId)

  const chain = supportChains.find(
    (v) => Number(v.layerOneChainId) === Number(chainId)
  )
  const layer2ChainId = chain?.chainId!

  const tokens = Object.values(supportTokens)
    .map((v) => v.id)
    .filter((v) => Number(v) > 17)
    .filter((v) => supportTokens[v].chains[layer2ChainId] !== undefined)

  const callAddresses = tokens.map((v) => chain?.mainContract!)
  const calls: string[] = tokens.map((id) => {
    return ZKLINK_INTERFACE.encodeFunctionData('getPendingBalance', [
      extendAddress(account),
      id,
    ])
  })

  const rs = await callMulticall(
    provider,
    multicall,
    ZKLINK_ABI,
    'getPendingBalance',
    callAddresses,
    calls
  )

  if (!rs.length) {
    return null
  }
  const result = tokens.map((tokenId, i) => {
    const decimals = supportTokens[tokenId].chains[layer2ChainId].decimals
    return {
      tokenId,
      decimals,
      symbol: supportTokens[tokenId].symbol,
      balance: rs[i],
      recoveryBalance: recoveryDecimals(rs[i], BigInt(decimals)),
    }
  })

  return result
    .filter((v) => v.balance > 0n)
    .map((v) => ({
      ...v,
      balance: v.balance.toString(),
      recoveryBalance: v.recoveryBalance.toString(),
    }))
}

export async function getPendingBalance(req: Request, res: Response) {
  try {
    const account = req.params.account
    const chainId = req.params.chainId ? Number(req.params.chainId) : undefined

    const data: Record<
      ChainId,
      {
        tokenId: number
        decimals: number
        symbol: string
        balance: string
        recoveryBalance: string
      }[]
    > = {}

    if (chainId) {
      const r = await batchGetPendingBalance(Number(chainId), account)
      if (r !== null) {
        data[chainId] = r
      }
    } else {
      const supportChains = await getSupportChains()

      const qs = supportChains.map((v) => {
        return batchGetPendingBalance(Number(v.layerOneChainId), account)
      })
      const rs = await Promise.all(qs)

      supportChains.forEach((v, i) => {
        if (rs[i] !== null) {
          data[v.layerOneChainId] = rs[i]!
        }
      })
    }

    res.json({
      code: 0,
      data,
    })
  } catch (e: any) {
    logger.error(e)
    res.json({
      code: e?.code ?? 500,
      message: e?.message,
    })
  }
}
