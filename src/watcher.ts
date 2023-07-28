import { AssistWithdraw } from './assistor'
import './conf/index'
import {
  fetchChains,
  initBlockConfirmations,
  initEventProfile,
} from './scanner'

export async function watcher() {
  await initEventProfile()
  await initBlockConfirmations()

  const assistor = new AssistWithdraw()
  await assistor.initSigners(await fetchChains())
  assistor.watchNewEventLogs()
}
