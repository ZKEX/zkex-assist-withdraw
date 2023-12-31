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
import { getMulticallContractByChainId } from '../../../utils/multicall'

export interface RequestsBody {
  chainId: ChainId
  maxFeePerGas: string
  maxPriorityFeePerGas: string
  txs: {
    tokenId: number
    receipter: Address
  }[]
}

async function handleWithdraw(body: RequestsBody): Promise<string | false> {
  const { chainId, maxFeePerGas, maxPriorityFeePerGas, txs } = body
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

  let fee: {
    maxFeePerGas?: bigint
    maxPriorityFeePerGas?: bigint
    gasPrice?: bigint
  } = {}

  if (Number(chainId) === 56) {
    fee.gasPrice = parseUnits(maxFeePerGas, 'gwei')
  } else if (maxFeePerGas) {
    fee.maxFeePerGas = parseUnits(maxFeePerGas, 'gwei')
    fee.maxPriorityFeePerGas = parseUnits(maxPriorityFeePerGas, 'gwei')
  }

  const tx = {
    from: wallet.address,
    to: multicall,
    data: calldata,
    nonce,
    gasLimit: estimateGasLimit(chainId, txs.length),
    ...fee,
  }

  if (!tx.gasLimit) {
    const provider = providerByChainId(chainId)
    const estimateGasLimit = await provider.estimateGas(tx)
    tx.gasLimit = (estimateGasLimit * 15n) / 10n
  }
  const transaction = await wallet.sendTransaction(tx)
  const timer = setTimeout(() => {
    throw new Error(`Timeout post withdrawal ${chainId}`)
  }, 120000)
  const wait = await transaction.wait()

  clearTimeout(timer)

  logger.info('Handle withdrawal successful')
  logger.info(wait?.hash)
  return wait!.hash
}

export async function postWithdrawalTxs(req: Request, res: Response) {
  try {
    let { chainId, maxFeePerGas, maxPriorityFeePerGas, txs } = req.body

    const supportChains = await getSupportChains()

    if (txs instanceof Array === false) {
      throw new PublicError(`Invalid params 'txs'`)
    }
    if (!txs.length) {
      throw new PublicError(`Invalid 'txs' length`)
    }
    if (Number(maxFeePerGas) > 500) {
      throw new PublicError(`'maxFeePerGas' overflow 500`)
    }
    if (Number(maxPriorityFeePerGas) > 500) {
      throw new PublicError(`'maxPriorityFeePerGas' overflow 500`)
    }
    const chain = supportChains.find((v) => v.layerOneChainId === chainId)
    if (!chain) {
      throw new PublicError(`Invalid chain id ${chainId}`)
    }

    const r = await handleWithdraw(req.body).catch((e) => {
      throw new PublicError(e?.message)
    })
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
