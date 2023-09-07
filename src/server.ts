import { EVENT_WATCHER_ENDPOINT, PORT, ZKLINK_STATIC_ENDPOINT } from './conf'
import { logger } from './log'
import { monitor } from './monitor'
import { watcher } from './watcher'
import express, { Request, Response } from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { metrics } from './routes/metrics'

async function main() {
  logger.info(`EVENT_WATCHER_ENDPOINT ${EVENT_WATCHER_ENDPOINT}`)
  logger.info(`ZKLINK_STATIC_ENDPOINT ${ZKLINK_STATIC_ENDPOINT}`)

  await watcher()
  await monitor()

  const app = express()
  app.use(cors())
  app.use(bodyParser.json())

  // Metrics endpoint for Prometheus to scrape
  app.get('/metrics', metrics)
  app.get('/requests/list', async (req: Request, res: Response) => {})

  app.listen({ port: PORT }, () => {
    console.log(`Server started on port ${PORT}`)
  })
}

main().catch((e: Error) => {
  console.log(e)
  logger.error(e)
  process.exit(1)
})
