import { Counter, Gauge, Registry } from 'prom-client'
import { logger } from '../log'
export const registry = new Registry()

export function updateMetric(fn: any) {
  try {
    fn && fn()
  } catch (e: any) {
    logger.error(e)
  }
}

export const metricProcessProgress = new Gauge({
  name: `process_progress`,
  help: `Processed and unprocessed logs per chain, status: processed | unprocessed`,
  labelNames: ['chain_id', 'status'],
})
registry.registerMetric(metricProcessProgress)

export const metricStartupProcessCount = new Counter({
  name: `startup_process_count`,
  help: `The processing count from the last startup of the service until now.`,
  labelNames: ['chain_id'],
})
registry.registerMetric(metricStartupProcessCount)

export const metricLastExecutedLogId = new Gauge({
  name: `last_executed_log_id`,
  help: `The last executed log ID for each chain.`,
  labelNames: ['chain_id'],
})
registry.registerMetric(metricLastExecutedLogId)

// export const metricContractScaningProgress = new Gauge({
//   name: `contract_scanning_progress`,
//   help: `Scanning progress for contract on chain.`,
//   labelNames: ['event_name', 'chain_id', 'contract_address'],
// })
// registry.registerMetric(metricContractScaningProgress)
