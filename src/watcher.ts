import { AssistWithdraw } from './assistor'
import './conf/index'
import { CHAIN_IDS } from './conf/index'
import { initBlockConfirmations, initChains, initEventProfile } from './scanner'
import { fetchMulticallContracts } from './utils/multicall'
import { getSupportChains, getSupportTokens } from './utils/zklink'

export async function watcher() {
  await getSupportChains()
  await getSupportTokens()
  await fetchMulticallContracts()
  await initChains()
  await initEventProfile()
  await initBlockConfirmations()

  const assistor = new AssistWithdraw()
  await assistor.initSigners(CHAIN_IDS)
  assistor.watchNewEventLogs()
}
