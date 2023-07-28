import { pool } from '.'
import { WithdrawalRequestParams } from '../utils/withdrawal'

export async function insertProcessedLogs(logs: WithdrawalRequestParams[]) {
  if (!logs?.length) return

  for (let log of logs) {
    await pool.query(
      `
        INSERT INTO processed_logs (log_id, chain_id, recepient, token_id, amount)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (log_id) DO NOTHING
      `,
      [
        log.logId,
        log.chainId,
        log.recepient,
        log.tokenId,
        log.amount.toBigInt(),
      ]
    )
  }
}

export async function selectMaxProcessedLogId() {
  return await pool.query(`
    SELECT MAX(log_id) AS "logId"
    FROM processed_logs;
  `)
}

export async function selectCountEachChain() {
  return await pool.query(`
    SELECT
      chain_id AS "chainId",
      COUNT(*) AS "count"
    FROM processed_logs
    GROUP BY chain_id;
  `)
}

export async function selectProcessedLogIdEachChain() {
  return await pool.query(`
    SELECT
      chain_id AS "chainId", MAX(log_id) AS "maxLogId"
    FROM processed_logs
    GROUP BY chain_id;
  `)
}
