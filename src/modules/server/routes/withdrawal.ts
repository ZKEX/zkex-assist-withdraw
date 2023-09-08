import { Request, Response } from 'express'
import { getRequestsPagedData } from '../../../db/requests'
import { PublicError, logger } from '../../../log'
import { Address, ChainId } from '../../../types'
import { Interface, Wallet, parseUnits } from 'ethers'
import { SUBMITTER_PRIVATE_KEY } from '../../../conf'
import { providerByChainId } from '../../../utils/providers'
import {
  MAXIMUM_WITHDRAWAL_AMOUNT,
  MULTICALL_INTERFACE,
  ZKLINK_INTERFACE,
} from '../../../utils'
import {
  encodeWithdrawData,
  fragmentWithdrawPendingBalance,
} from '../../../utils/withdrawal'
import { getSupportChains } from '../../../utils/zklink'
import { estimateGasLimit } from '../../assistor/gasLimit'
import { sleep } from '../../../utils/sleep'
import { getMulticallContractByChainId } from '../../../utils/multicall'

export interface RequestsBody {
  chainId: ChainId
  gasPrice: string // e.g. "1.5"
  txs: {
    tokenId: number
    receipter: Address
  }[]
}

async function handleWithdraw(body: RequestsBody): Promise<string | false> {
  const { chainId, gasPrice, txs } = body
  const provider = providerByChainId(chainId)
  const wallet = new Wallet(SUBMITTER_PRIVATE_KEY, provider)

  const multicall = getMulticallContractByChainId(chainId)
  const fragment = MULTICALL_INTERFACE.getFunction(
    'batchWithdrawPendingBalance'
  )
  const recepients = txs.map((v) => v.receipter)
  const tokenIds = txs.map((v) => v.tokenId)
  const amounts = txs.map((v) => MAXIMUM_WITHDRAWAL_AMOUNT)
  const calldata = MULTICALL_INTERFACE.encodeFunctionData(fragment!, [
    recepients,
    tokenIds,
    amounts,
  ])

  const nonce = await wallet.getNonce('latest')
  const tx = await wallet.sendTransaction({
    to: multicall,
    data: calldata,
    nonce,
    gasPrice: gasPrice ? parseUnits(gasPrice, 'gwei') : null,
    gasLimit: estimateGasLimit(chainId, txs.length) || 10000000n,
  })
  const timer = setTimeout(() => {
    throw new Error(`Timeout ${chainId}`)
  }, 120000)
  const wait = await tx.wait()

  clearTimeout(timer)

  logger.info('Handle withdrawal successful')
  logger.info(wait?.hash)
  return wait!.hash
}

export async function postWithdrawalTxs(req: Request, res: Response) {
  try {
    let { chainId, gasPrice, txs } = req.body

    const supportChains = await getSupportChains()

    if (txs instanceof Array === false) {
      throw new PublicError(`Invalid params 'txs'`)
    }
    if (!txs.length) {
      throw new PublicError(`Invalid 'txs' length`)
    }
    const chain = supportChains.find((v) => v.layerOneChainId === chainId)
    if (!chain) {
      throw new Error(`Invalid chain id ${chainId}`)
    }

    const r = await handleWithdraw(req.body)
    res.json({
      code: 0,
      data: r,
    })
  } catch (e: any) {
    logger.error(e)
    res.json({
      code: e?.code ?? 500,
      message: e?.message,
    })
  }
}
