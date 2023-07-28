import Fastify from 'fastify'
import { PORT } from './conf'
import { logger } from './log'
import { monitor } from './monitor'
import { registry } from './monitor/registry'
import { watcher } from './watcher'

async function main() {
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
