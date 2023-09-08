import { EVENT_WATCHER_ENDPOINT, ZKLINK_STATIC_ENDPOINT } from './conf'
import { logger } from './log'
import { monitor } from './monitor'
import { assistor } from './modules/assistor'
import { server } from './modules/server/server'

async function main() {
  logger.info(`EVENT_WATCHER_ENDPOINT ${EVENT_WATCHER_ENDPOINT}`)
  logger.info(`ZKLINK_STATIC_ENDPOINT ${ZKLINK_STATIC_ENDPOINT}`)

  await assistor()
  await server()
  await monitor()
}

main().catch((e: Error) => {
  console.log(e)
  logger.error(e)
  process.exit(1)
})
