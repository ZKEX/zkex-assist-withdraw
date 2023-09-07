import { pool } from '.'

export async function getRequestsPagedData({
  page,
  limit,
  hash
}: {
  page: number
  limit: number
  hash: string | undefined
}) {
  const countSql = [`SELECT COUNT(*) as count FROM requests`]
  if (typeof hash === 'string') {
    countSql.push(`
      WHERE tx_id='${hash}'
    `)
  }
  const countResult = await pool.query(countSql.join(' '))
  const totalCount = countResult.rows[0].count

  const offset = page * limit

  const sql = [
    `
      SELECT
        id,
        function_data AS "functionData",
        tx_id AS "txId",
        chain_id AS "chainId",
        log_id AS "logId",
        created_at AS "createdAt"
      FROM requests
    `
  ]
  if (typeof hash === 'string') {
    sql.push(`
      WHERE tx_id='${hash}'
    `)
  }

  sql.push(`ORDER BY created_at DESC`)
  sql.push(`LIMIT ${limit}`)
  sql.push(`OFFSET ${offset}`)

  const listResult = await pool.query(sql.join(' '))
  const list = listResult.rows

  return {
    count: totalCount,
    list: list
  }
}
