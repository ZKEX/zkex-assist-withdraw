import { AssistWithdraw } from './assistor'
import './conf/index'
import { CHAIN_IDS } from './conf/index'
import {
  initBlockConfirmations,
  initEventChains,
  initEventProfile,
} from './scanner'
import { fetchMulticallContracts } from './utils/multicall'
import { getSupportChains, getSupportTokens } from './utils/zklink'

export async function watcher() {
  const supportChains = await getSupportChains()
  await getSupportTokens()
  await fetchMulticallContracts()
  await initEventChains()
  await initEventProfile()
  await initBlockConfirmations()

  const assistor = new AssistWithdraw()
  await assistor.initSigners(
    supportChains.map((v) => Number(v.layerOneChainId))
  )
  assistor.watchNewEventLogs()
}
