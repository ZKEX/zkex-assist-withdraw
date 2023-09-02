import dotenv from 'dotenv'
import { Address, ChainId } from '../types'
import { logger } from '../log'

dotenv.config({ path: `.env.${process.env.APP_ENV}`, override: true })
dotenv.config({ path: `.env.${process.env.APP_ENV}.local`, override: true })

export const APP_ENV = process.env.APP_ENV

// Submitter private key, the private key is used to assist users with withdrawals.
export const SUBMITTER_PRIVATE_KEY = process.env.SUBMITTER_PRIVATE_KEY!
// The fee strategy is a service provided by the event watcher, with three options available: "standard", "fast", and "rapid".
export const SUBMITTER_FEE_POLICY: 'standard' | 'fast' | 'rapid' = process.env
  .SUBMITTER_FEE_POLICY! as 'standard' | 'fast' | 'rapid'
// This number is used to control the maximum number of transactions to be merged.
export const MAXIMUM_PACK_TX_LIMIT = Number(process.env.MAXIMUM_PACK_TX_LIMIT)

export const CHAIN_IDS: ChainId[] = process.env
  .CHAIN_IDS!.split(',')
  .map((v) => Number(v))

// ---------------- server port ----------------
export const PORT = Number(process.env.PORT)

export const DATABASE_CONNECTION = process.env.DATABASE_CONNECTION!

// ---------------- event watcher ----------------
export const EVENT_WATCHER_ENDPOINT = process.env.EVENT_WATCHER_ENDPOINT!
export const POLLING_LOGS_INTERVAL = Number(process.env.POLLING_LOGS_INTERVAL)
export const POLLING_LOGS_LIMIT = Number(process.env.POLLING_LOGS_LIMIT)

export const ZKLINK_RPC_ENDPOINT = process.env.ZKLINK_RPC_ENDPOINT!
export const ZKLINK_SCAN_ENDPOINT = process.env.ZKLINK_SCAN_ENDPOINT!
export const ZKLINK_STATIC_ENDPOINT = process.env.ZKLINK_STATIC_ENDPOINT!

// ---------------- topic ----------------
export const EVENT_NAME = 'WithdrawalPending'

// ---------------- logger ----------------
export const TRANSPORT_CONSOLE = true

export const gasLimitForChains: Record<ChainId, bigint> = {}
