import fetch from 'node-fetch'
import { ZKLINK_STATIC_ENDPOINT } from '../conf'
import { Address, ChainId } from '../types'
import { Contract, Interface, JsonRpcProvider } from 'ethers'
import Multicall from '../abi/Multicall.json'
import { PublicError } from '../log'

export const MULTICALL_INTERFACE = new Interface(Multicall.abi)

const multicallContracts: Record<ChainId, Address> = {}

export async function fetchMulticallContracts() {
  const r: {
    multicall: Record<string, string>
  } = {
    "multicall": {
      "0x1": "0x139abB67A33F6DDCF00fbaB5E321184F4e5C22E1",
      "0x5": "0xAb90a0a1f7E97C07EFa0a7F065636D04980dB169",
      "0xa": "0x028781cEed4A2264466ef5AB73c91603087fa131",
      "0x38": "0x7c56DA81caACEcEEfF624BAA93B314e793bC88b3",
      "0x61": "0xF179559d326BfB0Fd253792B662E848342181a67",
      "0x89": "0x09CB6C5A235939258e3F6Ae2989cf6f26EeE1c72",
      "0xcc": "0x0d53cE63f3A72879d543ed6272A081308A731470",
      "0x118": "0x093EA2d1e10c873684Fd8a5E272898120521Af37",
      "0x144": "0x20126263a37d5039086D92a4703a17610C541450",
      "0x1a4": "0x824B17cde928075523d6cB822Bccd341123261f7",
      "0x1389": "0x733aDFA13EDfA308C728423Cc8AF8F4E1cCF02a7",
      "0x15eb": "0xdbA72d5d26823F0E92FacDE8b3CE4f9897595f35",
      "0x2105": "0xDd5097FC3f68958649cE70F42B7c1CF0067a3545",
      "0xa4b1": "0x028781cEed4A2264466ef5AB73c91603087fa131",
      "0xa869": "0xf78e589d782c4e8A5b162EbE7bd138c74B285cE8",
      "0xa86a": "0x028781cEed4A2264466ef5AB73c91603087fa131",
      "0xe704": "0x180C2f02253078649e24fAA7C4E8510eC81C4502",
      "0xe708": "0x50efC7f1290479cb879473512D89fDC80B726211",
      "0x13881": "0x866350b2FFF5179398695bc1224857a54B79bae0",
      "0x14a33": "0xFa9FD562Ca901b4998f99c9335a66d97E1be70D3",
      "0x28c5d": "0xa5327B1fBBBd4F3b8d06070a86090269ec35445e",
      "0x66eed": "0xaF9EAf902516627262B20DB424E60cB656a41B96",
      "0x82751": "0xcf5495D0A60764C764340662b37F8AA7ce5a1ed0",
      "0x34816d": "0xb73C42EA5E5226535B98Ff844758d039eeCb80c7"
    },
    "faucet": {
      "0x5": "0xbCE2178b24A5Ba3fC894354C9cE0Df49327aD205",
      "0x61": "0xBc3A5e1DE29C437734eA411f3C5aE7cc52d28417",
      "0x118": "0xB1509Bf59707708d4Ed39FB5E4149a47E957ffd7",
      "0x1a4": "0x5cA0EE4446a2b5F3ac2dd30FF60E100cda21d6c8",
      "0x1389": "0xB627B5210Cc313AB37B78f05DD7733e051220FC1",
      "0x15eb": "",
      "0xa869": "0x47fc2e85490F946030d4B6600C441b7Ca6BD0eaf",
      "0xe704": "0x7b70FBC54e70cEbcD3d3e05DB563694c1cDA13eb",
      "0x13881": "0xF2a3e2F84d47e8cA5f7D3dC83F742c9973D2B855",
      "0x14a33": "0xC419a97ECd037dF3f431d3632286B42cedff734B",
      "0x28c5d": "0xb25739d27690C82c53ec2AF197B9d1B3E4cA14Ee",
      "0x66eed": "0x7b70FBC54e70cEbcD3d3e05DB563694c1cDA13eb",
      "0x34816d": "0xC419a97ECd037dF3f431d3632286B42cedff734B"
    }
  }
  

  const { multicall } = r

  if (!multicall) {
    throw new PublicError('Can not fetch multicall contracts')
  }

  for (let chainId in multicall) {
    multicallContracts[Number(chainId)] = multicall[chainId]
  }

  return multicallContracts
}

export function getMulticallContracts() {
  return multicallContracts
}
export function getMulticallContractByChainId(chainId: ChainId) {
  return multicallContracts[chainId]
}

export const callMulticall = async (
  provider: JsonRpcProvider,
  multicallContract: Address,
  abi: any[],
  functionName: string,
  callAddresses: Address[],
  calls: any[]
) => {
  try {
    const iface = new Interface(abi)
    const fragment = iface.getFunction(functionName)!
    const contract = new Contract(multicallContract, Multicall.abi, provider)
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
