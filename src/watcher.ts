import { AssistWithdraw } from './assistor'
import './conf/index'
import { CHAIN_IDS } from './conf/index'
import { initBlockConfirmations, initEventProfile } from './scanner'
import { fetchMulticallContracts } from './utils/multicall'

export async function watcher() {
  await fetchMulticallContracts()
  await initEventProfile()
  await initBlockConfirmations()

  const assistor = new AssistWithdraw()
  await assistor.initSigners(CHAIN_IDS)
  assistor.watchNewEventLogs()
}
