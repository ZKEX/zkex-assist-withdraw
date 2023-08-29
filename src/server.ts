import Fastify from 'fastify'
import { EVENT_WATCHER_ENDPOINT, PORT, ZKLINK_STATIC_ENDPOINT } from './conf'
import { logger } from './log'
import { monitor } from './monitor'
import { registry } from './monitor/registry'
import { watcher } from './watcher'
import { getSupportTokens } from './utils/zklink'

async function main() {
  await getSupportTokens()

  logger.info(`EVENT_WATCHER_ENDPOINT ${EVENT_WATCHER_ENDPOINT}`)
  logger.info(`ZKLINK_STATIC_ENDPOINT ${ZKLINK_STATIC_ENDPOINT}`)

  const fastify = Fastify({
    logger: false,
  })

  await watcher()
  await monitor()

  // Metrics endpoint for Prometheus to scrape
  fastify.get('/metrics', async (request, reply) => {
    reply.type(registry.contentType).code(200)
    return await registry.metrics()
  })

  fastify.listen({ port: PORT }, (err, address) => {
    if (err) throw err
    console.log(`Server started on port ${PORT}, ${address}`)
  })
}

main().catch((e: Error) => {
  console.log(e)
  logger.error(e)
  process.exit(1)
})
