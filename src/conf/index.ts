import dotenv from 'dotenv'
import { Address, ChainId } from '../types'

dotenv.config({ path: `.env.${process.env.APP_ENV}` })
dotenv.config({ path: `.env.${process.env.APP_ENV}.local`, override: true })

export const APP_ENV = process.env.APP_ENV

// Submitter private key, the private key is used to assist users with withdrawals.
export const SUBMITTER_PRIVATE_KEY = process.env.SUBMITTER_PRIVATE_KEY!
// The fee strategy is a service provided by the event watcher, with three options available: "standard", "fast", and "rapid".
export const SUBMITTER_FEE_POLICY: 'standard' | 'fast' | 'rapid' = process.env
  .SUBMITTER_FEE_POLICY! as 'standard' | 'fast' | 'rapid'
export const SUBMITTER_GAS_LIMIT = '100000'
// This number is used to control the maximum number of transactions to be merged.
export const MAXIMUM_PACK_TX_LIMIT = Number(process.env.MAXIMUM_PACK_TX_LIMIT)

// ---------------- server port ----------------
export const PORT = Number(process.env.PORT)

export const DATABASE_CONNECTION = process.env.DATABASE_CONNECTION!

// ---------------- event watcher ----------------
export const EVENT_WATCHER_ENDPOINT = process.env.EVENT_WATCHER_ENDPOINT!
export const POLLING_LOGS_INTERVAL = Number(process.env.POLLING_LOGS_INTERVAL)
export const POLLING_LOGS_LIMIT = Number(process.env.POLLING_LOGS_LIMIT)

// ---------------- topic ----------------
export const EVENT_NAME = 'WithdrawalPending'

// ---------------- logger ----------------
export const TRANSPORT_CONSOLE = true

// Multicall contract addresses
export const multicallContract: Record<ChainId, Address> = {
  // ======= Mainnet =======
  // Ethereum
  1: '0x139abB67A33F6DDCF00fbaB5E321184F4e5C22E1',
  // BSC
  56: '0x7c56DA81caACEcEEfF624BAA93B314e793bC88b3',
  // Polygon
  137: '0x09CB6C5A235939258e3F6Ae2989cf6f26EeE1c72',
  // zkSync Era
  324: '0x20126263a37d5039086D92a4703a17610C541450',
  // Arbitrum
  42161: '0x028781cEed4A2264466ef5AB73c91603087fa131',
  // Avalanche
  43114: '0x028781cEed4A2264466ef5AB73c91603087fa131',
  // Linea
  59144: '0x50efC7f1290479cb879473512D89fDC80B726211',

  // ======= Testnet =======
  // Goerli Testnet
  5: '0xBb19f393E1EAa08408190e6D14C6c89fC27834E7',
  // BSC Testnet
  97: '0x5d9506df44a6A1a31ccAc7B1d7BfF7C6060624c8',
  // Optimism Testnet
  420: '0x87007Ba1823FFcafF89b72142fF3165F23ea9B8F',
  // Avalanche Testnet
  43113: '0xC054C98FC3BD2F218c4EE882326f032BCa7a4ab7',
  // Linea Testnet
  59140: '0x22BA8bb2b1Ea8C122f584bcbADa0cFA2d0886b49',
  // Polygon Testnet
  80001: '0x5dDc357917979d5dEce59cc68A8444Ccd6F4B7cb',
  // Arbitrum Testnet
  421613: '0x5f25856e4f191cea5f1D8ca42Ba9C163CaBeb0a9',
}
