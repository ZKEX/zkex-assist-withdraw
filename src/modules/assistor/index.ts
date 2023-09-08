import { AssistWithdraw } from './assistor'
import '../../conf/index'
import {
  initBlockConfirmations,
  initEventChains,
  initEventProfile,
} from '../scanner/scanner'
import { fetchMulticallContracts } from '../../utils/multicall'
import { getSupportChains, getSupportTokens } from '../../utils/zklink'

export async function assistor() {
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
