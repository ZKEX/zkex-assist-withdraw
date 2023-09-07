import { pool } from '.'

export async function getPackedTransactionsPagedData(
  page: number,
  limit: number
) {
  const countResult = await pool.query(
    'SELECT COUNT(*) as count FROM packed_transactions'
  )
  const totalCount = countResult.rows[0].count

  const offset = page * limit

  const listResult = await pool.query(
    `
      SELECT
        id,
        nonce,
        tx_id AS "txId",
        chain_id AS "chainId",
        max_fee_per_gas AS "maxFeePerGas",
        max_priority_fee_per_gas AS "maxPriorityFeePerGas",
        gas_price AS "gasPrice",
        request_ids AS "requestIds",
        confirmation,
        created_at AS "createdAt"
      FROM packed_transactions
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `,
    [limit, offset]
  )
  const list = listResult.rows

  return {
    count: totalCount,
    list: list
  }
}
