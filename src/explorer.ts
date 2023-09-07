import fetch from 'node-fetch'
import { selectPackedTransactionByHash, selectRequestsByIds } from './db/query'
import { Address, ChainId } from './types'
import { ZKLINK_SCAN_ENDPOINT } from './conf'
import { logger } from './log'
import { WithdrawalRequestParams } from './utils/withdrawal'

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
    logger.info(
      `Update packed hash success, chain: ${chainId}, packed hash: ${packedHash}, requestIds: ${requestIds}`
    )
    params.forEach((v) => {
      logger.info(
        `Chain: ${v.chainId}, Executed Hash: ${v.executedHash}, To Address: ${v.toAddress}, Token: ${v.tokenId}, Amount: ${v.amount}, Log Index: ${v.logIndex}`
      )
    })
    const r = await explorerRpc('update_withdraw_hash', [params]).catch((e) => {
      throw e
    })

    console.log(r)

    if (r.error) {
      throw new Error(
        `Update withdrawal hash fail, chain: ${chainId}, packed hash: ${packedHash}, code: ${r.error.code}, message: ${r.error.message}`
      )
    }

    if (r.result || r.result === null) {
      logger.info(
        `Update packed hash success, chain: ${chainId}, packed hash: ${packedHash}, requestIds: ${requestIds}`
      )
      params.forEach((v) => {
        logger.info(
          `Chain: ${v.chainId}, Executed Hash: ${v.executedHash}, To Address: ${v.toAddress}, Token: ${v.tokenId}, Amount: ${v.amount}, Log Index: ${v.logIndex}`
        )
      })
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
    throw new Error(
      `cannot find packed hash in database, chain ${chainId}, hash ${packedHash}`
    )
  }

  const { requestIds } = rows[0]

  if (!requestIds) {
    throw new Error(`requestIds is null, chain ${chainId}, hash ${packedHash}`)
  }

  return requestIds
}

export async function queryFunctionDataByIds(
  ids: string // ArrayString, e.g. "13,24,99"
): Promise<WithdrawalRequestParams[]> {
  const { rows } = await selectRequestsByIds(ids)

  return rows.map((v) => JSON.parse(v.functionData))
}