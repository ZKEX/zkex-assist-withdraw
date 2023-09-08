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
import { getSupportChains, getSupportTokens } from '../../../utils/zklink'
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

  const tokens = Object.values(supportTokens).map((v) => v.id)

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
    return {
      tokenId: v,
      symbol: supportTokens[v].symbol,
      balance: rs[i],
    }
  })

  return result
}

export async function getPendingBalance(req: Request, res: Response) {
  try {
    let { account, chainId } = req.params

    const balances = await batchGetPendingBalance(Number(chainId), account)

    res.json({
      code: 0,
      data: balances.filter((v) => v.balance > 0n),
    })
  } catch (e: any) {
    logger.error(e)
    res.json({
      code: e?.code ?? 500,
      message: e?.message,
    })
  }
}
