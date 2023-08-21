import fetch from 'node-fetch'
import { ZKLINK_STATIC_ENDPOINT } from '../conf'
import { Address, ChainId } from '../types'
import { Contract, Interface, JsonRpcProvider } from 'ethers'
import Multicall from '../abi/Multicall.json'

export const MULTICALL_INTERFACE = new Interface(Multicall.abi)

const multicallContracts: Record<ChainId, Address> = {}

export async function fetchMulticallContracts() {
  const r: {
    multicall: Record<string, string>
  } = await fetch(`${ZKLINK_STATIC_ENDPOINT}/contracts/main.json`, {
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((r) => r.json())

  const { multicall } = r

  if (!multicall) {
    throw new Error('Can not fetch multicall contracts')
  }

  for (let chainId in multicall) {
    multicallContracts[Number(chainId)] = multicall[chainId]
  }

  return multicallContracts
}

export function getMulticallContracts() {
  return multicallContracts
}

export const callMulticall = async (
  provider: JsonRpcProvider,
  contractAddress: Address,
  abi: any[],
  functionName: string,
  callAddresses: Address[],
  calls: any[]
) => {
  try {
    const iface = new Interface(abi)
    const fragment = iface.getFunction(functionName)!
    const contract = new Contract(contractAddress, Multicall.abi, provider)
    const tx = await contract.multiStaticCall(callAddresses, calls)

    const [blockNumber, returnDatas] = tx
    return returnDatas.map(
      (
        data: {
          success: boolean
          returnData: string
        },
        index: number
      ) => {
        const decodeData = iface.decodeFunctionResult(fragment, data.returnData)
        return decodeData[0]
      }
    )
  } catch (e) {
    return []
  }
}
