import { PORT } from '../../conf'
import express from 'express'
import cors from 'cors'
import bodyParser from 'body-parser'
import { metrics } from './routes/metrics'
import { getRequests } from './routes/getRequests'
import { getPackedTransactions } from './routes/getPackedTransactions'
import { postWithdrawalTxs } from './routes/withdrawal'
import { getPendingBalance } from './routes/balance'

export async function server() {
  const app = express()
  app.use(cors())
  app.use(bodyParser.json())

  // Metrics endpoint for Prometheus to scrape
  app.get('/metrics', metrics)
  app.get('/requests/list', getRequests)
  app.get('/transactions/list', getPackedTransactions)
  app.post('/withdrawal', postWithdrawalTxs)
  app.get('/balance/:account/:chainId', getPendingBalance)
  app.get('/balance/:account', getPendingBalance)

  app.listen({ port: PORT }, () => {
    console.log(`Server started on port ${PORT}`)
  })
}
