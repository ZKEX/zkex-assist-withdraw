import { utils } from 'ethers'
import { abi as MulticallAbi } from '../abi/Multicall.json'
import { abi as ZkLinkAbi } from '../abi/ZkLink.json'

export const ZKLINK_INTERFACE = new utils.Interface(ZkLinkAbi)
export const MULTICALL_INTERFACE = new utils.Interface(MulticallAbi)
