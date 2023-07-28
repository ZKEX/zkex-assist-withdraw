import { monitorJobs } from './jobs'

export async function monitor() {
  await monitorJobs()
}
