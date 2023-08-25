import { Interface } from 'ethers'
import { abi as MulticallAbi } from '../abi/Multicall.json'
import { abi as ZkLinkAbi } from '../abi/ZkLink.json'

export const ZKLINK_ABI = ZkLinkAbi
export const MULTICALL_ABI = MulticallAbi
export const ZKLINK_INTERFACE = new Interface(ZkLinkAbi)
export const MULTICALL_INTERFACE = new Interface(MulticallAbi)

export const MAXIMUM_WITHDRAWAL_AMOUNT = BigInt(
  '0xffffffffffffffffffffffffffffffff'
)
