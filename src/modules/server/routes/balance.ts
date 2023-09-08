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

  const tokens = Object.values(supportTokens)
    .map((v) => v.id)
    .filter((v) => v > 17)

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

  const result = tokens.map((v, i) => {
    const decimals = supportTokens[v].chains[chainId].decimals
    return {
      tokenId: v,
      decimals,
      symbol: supportTokens[v].symbol,
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
      data[chainId] = await batchGetPendingBalance(Number(chainId), account)
    } else {
      const supportChains = await getSupportChains()

      const qs = supportChains.map((v) => {
        return batchGetPendingBalance(Number(v.layerOneChainId), account)
      })
      const rs = await Promise.all(qs)

      supportChains.forEach((v, i) => {
        data[v.layerOneChainId] = rs[i]
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
