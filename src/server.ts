import { logger } from './log'
import { watcher } from './watcher'

async function main() {
  await watcher()
}

main().catch((e: Error) => {
  console.log(e)
  logger.error(e)
  process.exit(1)
})
