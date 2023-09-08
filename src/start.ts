import { EVENT_WATCHER_ENDPOINT, ZKLINK_STATIC_ENDPOINT } from './conf'
import { logger } from './log'
import { monitor } from './monitor'
import { assistor } from './modules/assistor'
import { server } from './modules/server/server'
import { initEventChains, initEventProfile } from './modules/scanner/scanner'
import { getSupportChains, getSupportTokens } from './utils/zklink'
import { fetchMulticallContracts } from './utils/multicall'

async function main() {
  logger.info(`EVENT_WATCHER_ENDPOINT ${EVENT_WATCHER_ENDPOINT}`)
  logger.info(`ZKLINK_STATIC_ENDPOINT ${ZKLINK_STATIC_ENDPOINT}`)

  await initEventChains()
  await initEventProfile()
  await getSupportChains()
  await getSupportTokens()
  await fetchMulticallContracts()

  await assistor()
  await server()
  await monitor()
}

main().catch((e: Error) => {
  console.log(e)
  logger.error(e)
  process.exit(1)
})
