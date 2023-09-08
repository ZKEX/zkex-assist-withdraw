import { ChainId } from '../../types'

export enum MainnetChainIds {
  Ethereum = 1,
  Optimism = 10,
  BSC = 56,
  Polygon = 137,
  opBNB = 204,
  zkSyncEra = 324,
  PolygonZkEVM = 1101,
  Base = 8453,
  Arbitrum = 42161,
  Avalanche = 43114,
  Linea = 59144,
}

export enum TestnetChainIds {
  Goerli = 5,
  BSC = 97,
  zkSyncEra = 280,
  Optimism = 420,
  Mantle = 5001,
  opBNB = 5611,
  Avalanche = 43113,
  Linea = 59140,
  Polygon = 80001,
  Base = 84531,
  Taiko = 167005,
  ArbitrumGoerli = 421613,
  Scroll = 534353,
  Manta = 3441005,
}

const singleTxGasLimit: {
  [chainId: ChainId]: { singleTx: number; max: number }
} = {
  [MainnetChainIds.Ethereum]: { singleTx: 200000, max: 30000000 },
  [MainnetChainIds.Polygon]: { singleTx: 200000, max: 30000000 },
  [MainnetChainIds.Avalanche]: { singleTx: 200000, max: 15000000 },
  [MainnetChainIds.BSC]: { singleTx: 200000, max: 50000000 },
  [MainnetChainIds.Optimism]: { singleTx: 200000, max: 30000000 },
  [MainnetChainIds.Linea]: { singleTx: 200000, max: 61000000 },
  [MainnetChainIds.Base]: { singleTx: 200000, max: 25000000 },
  [MainnetChainIds.opBNB]: { singleTx: 200000, max: 100000000 },
  // [MainnetChainIds.Arbitrum]: { singleTx: 3000000, max: 1125899906842624 },

  [TestnetChainIds.Goerli]: { singleTx: 200000, max: 30000000 },
  [TestnetChainIds.Polygon]: { singleTx: 200000, max: 30000000 },
  [TestnetChainIds.Avalanche]: { singleTx: 200000, max: 15000000 },
  [TestnetChainIds.BSC]: { singleTx: 200000, max: 50000000 },
  [TestnetChainIds.Base]: { singleTx: 200000, max: 25000000 },
  [TestnetChainIds.Linea]: { singleTx: 200000, max: 61000000 },
  [TestnetChainIds.Manta]: { singleTx: 200000, max: 30000000 },
  [TestnetChainIds.Mantle]: { singleTx: 100000, max: 30000000 },
  [TestnetChainIds.opBNB]: { singleTx: 200000, max: 100000000 },
  [TestnetChainIds.Taiko]: { singleTx: 200000, max: 5180000 },
  [TestnetChainIds.Optimism]: { singleTx: 200000, max: 30000000 },
  // [TestnetChainIds.ArbitrumGoerli]: { singleTx: 3000000, max: 1125899906842624 },
}

export function estimateGasLimit(
  layer1ChainId: ChainId,
  transactionCount: number
): bigint | undefined {
  if (singleTxGasLimit[layer1ChainId]) {
    const totalGasLimit = BigInt(
      singleTxGasLimit[layer1ChainId].singleTx * transactionCount
    )
    return totalGasLimit > BigInt(singleTxGasLimit[layer1ChainId].max)
      ? BigInt(singleTxGasLimit[layer1ChainId].max)
      : totalGasLimit
  }
  return undefined
}
