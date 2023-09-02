import { pool } from '.'
import { ChainId } from '../types'

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

export async function selectPackedTransactionByHash(
  chainId: ChainId,
  hash: string
) {
  return await pool.query(`
    SELECT
      request_ids AS "requestIds"
    FROM packed_transactions
    WHERE
      tx_id='${hash}' AND chain_id=${chainId};
  `)
}

/**
 *
 * @param ids ArrayString, e.g. "13,24,99"
 * @returns
 */
export async function selectRequestsByIds(ids: string) {
  return await pool.query(`
    SELECT
      id,
      function_data AS "functionData"
    FROM requests WHERE id IN (${ids}) ORDER BY id;
  `)
}
