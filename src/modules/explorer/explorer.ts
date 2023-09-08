import fetch from 'node-fetch'
import {
  selectPackedTransactionByHash,
  selectRequestsByIds,
} from '../../db/query'
import { Address, ChainId } from '../../types'
import { ZKLINK_SCAN_ENDPOINT } from '../../conf'
import { PublicError, logger } from '../../log'
import { WithdrawalRequestParams } from '../../utils/withdrawal'
import { insertWithdrawalHash } from '../../db/withdrawalHash'

async function explorerRpc(method: string, params: any[] = [], id: number = 1) {
  return fetch(ZKLINK_SCAN_ENDPOINT, {
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

export interface updateWithdrawalItem {
  executedHash: string
  toAddress: Address
  chainId: string // Layer one chain id
  amount: string
  tokenId: number
  logIndex: number
  withdrawHash: string
}

function saveWithdrawalHash(params: updateWithdrawalItem[], status: 1 | 2) {
  params.forEach((v) => {
    insertWithdrawalHash(
      v.executedHash,
      v.toAddress,
      Number(v.chainId),
      v.amount,
      v.tokenId,
      v.logIndex,
      v.withdrawHash,
      status
    )
  })
}

export async function updateWithdrawalHash(
  chainId: ChainId,
  packedHash: string
) {
  try {
    const requestIds = await queryRequestIdsByHash(chainId, packedHash)

    const requests = await queryFunctionDataByIds(requestIds)

    const params: updateWithdrawalItem[] = requests.map((v) => ({
      executedHash: v.ethHash,
      toAddress: v.recepient,
      chainId: v.chainId.toString(),
      amount: v.amount.toString(),
      tokenId: Number(v.tokenId),
      logIndex: v.logIndex,
      withdrawHash: packedHash,
    }))
    const r = await explorerRpc('update_withdraw_hash', [params]).catch((e) => {
      saveWithdrawalHash(params, 2)

      throw e
    })

    if (r.error) {
      saveWithdrawalHash(params, 2)
      throw new PublicError(
        `Update withdrawal hash fail, chain: ${chainId}, packed hash: ${packedHash}, code: ${r.error.code}, message: ${r.error.message}`
      )
    }

    if (r.result || r.result === null) {
      logger.info(
        `Update packed hash success, chain: ${chainId}, packed hash: ${packedHash}, requestIds: ${requestIds}`
      )
      saveWithdrawalHash(params, 1)
    }
  } catch (e: any) {
    logger.error(e?.message)
    logger.error(e)
  }
}

export async function queryRequestIdsByHash(
  chainId: ChainId,
  packedHash: string
) {
  const { rows } = await selectPackedTransactionByHash(chainId, packedHash)

  if (!rows?.length) {
    throw new PublicError(
      `cannot find packed hash in database, chain ${chainId}, hash ${packedHash}`
    )
  }

  const { requestIds } = rows[0]

  if (!requestIds) {
    throw new PublicError(
      `requestIds is null, chain ${chainId}, hash ${packedHash}`
    )
  }

  return requestIds
}

export async function queryFunctionDataByIds(
  ids: string // ArrayString, e.g. "13,24,99"
): Promise<WithdrawalRequestParams[]> {
  const { rows } = await selectRequestsByIds(ids)

  return rows.map((v) => JSON.parse(v.functionData))
}
