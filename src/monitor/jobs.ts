import { CronJob } from 'cron'
import { Registry } from 'prom-client'
import {
  selectCountEachChain,
  selectProcessedLogIdEachChain,
} from '../db/query'
import { fetchCountLogs, getEventProfile } from '../scanner'
import { withdrawalEventTopic } from '../utils/withdrawal'
import {
  metricLastExecutedLogId,
  metricProcessProgress,
  updateMetric,
} from './registry'
export const registry = new Registry()

const cronProcessProgress = new CronJob('*/15 * * * * *', async () => {
  const { rows: rowsCountLog } = await selectCountEachChain()

  rowsCountLog.forEach((v) => {
    updateMetric(() => {
      metricProcessProgress
        .labels(v.chainId.toString(), 'processed')
        .set(Number(v.count) ?? 0)
    })
  })

  const { rows: rowsProcessedLogId } = await selectProcessedLogIdEachChain()

  const eventProfile = getEventProfile()
  rowsProcessedLogId.forEach(async (v) => {
    updateMetric(() => {
      metricLastExecutedLogId.labels(v.chainId.toString()).set(v.maxLogId)
    })

    const count = await fetchCountLogs(
      withdrawalEventTopic,
      v.chainId,
      eventProfile.chains[v.chainId][0].contractAddress,
      v.maxLogId > 0 ? v.maxLogId + 1 : 0
    )

    updateMetric(() => {
      metricProcessProgress
        .labels(v.chainId.toString(), 'unprocessed')
        .set(Number(count) ?? 0)
    })
  })
})

export async function monitorJobs() {
  cronProcessProgress.fireOnTick()
  cronProcessProgress.start()
}
