import { pool } from '.'
import { WithdrawalRequestParams } from '../utils/withdrawal'

export async function selectMaxProcessedLogId() {
  return await pool.query(`
    SELECT MAX(log_id) AS "logId"
    FROM requests;
  `)
}

export async function selectCountEachChain() {
  return await pool.query(`
    SELECT
      chain_id AS "chainId",
      COUNT(*) AS "count"
    FROM requests
    GROUP BY chain_id;
  `)
}

export async function selectProcessedLogIdEachChain() {
  return await pool.query(`
    SELECT
      chain_id AS "chainId", MAX(log_id) AS "maxLogId"
    FROM requests
    WHERE
      tx_id!=''
    GROUP BY chain_id;
  `)
}
