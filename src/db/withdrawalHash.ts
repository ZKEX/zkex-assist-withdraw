import { pool } from '.'
import { Address, ChainId } from '../types'

export async function insertWithdrawalHash(
  executedHash: string,
  toAddress: Address,
  chainId: ChainId,
  amount: string,
  tokenId: number,
  logIndex: number,
  withdrawalHash: string,
  status: 1 | 2 // 1: sent successful, 2: sent failed
) {
  try {
    const query = `
          INSERT INTO withdrawal_hash 
          (executed_hash, to_address, chain_id, amount, token_id, log_index, withdrawal_hash, status)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id;
      `

    const values = [
      executedHash,
      toAddress,
      chainId,
      amount,
      tokenId,
      logIndex,
      withdrawalHash,
      status,
    ]

    const result = await pool.query(query, values)
    return result.rows[0].id
  } catch (err) {
    console.error('Error inserting data:', err)
  }
}
