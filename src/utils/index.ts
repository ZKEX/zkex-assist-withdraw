import { Interface } from 'ethers'
import { abi as MulticallAbi } from '../abi/Multicall.json'
import { abi as ZkLinkAbi } from '../abi/ZkLink.json'

export const ZKLINK_INTERFACE = new Interface(ZkLinkAbi)
export const MULTICALL_INTERFACE = new Interface(MulticallAbi)
