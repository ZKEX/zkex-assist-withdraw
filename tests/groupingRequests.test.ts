import { BigNumber } from 'ethers'
import {
  WithdrawalRequestParams,
  groupingRequestParams,
} from '../src/utils/withdrawal'

describe('grouping requests', () => {
  it(`grouping requests by chain id`, () => {
    const requests: WithdrawalRequestParams[] = [
      {
        chainId: 5,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 100,
        amount: BigNumber.from('10'),
        logId: 1,
      },
      {
        chainId: 80001,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 100,
        amount: BigNumber.from('10'),
        logId: 2,
      },
      {
        chainId: 80001,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 110,
        amount: BigNumber.from('10'),
        logId: 3,
      },
    ]
    const r = groupingRequestParams(requests)
    expect(r).toMatchObject({
      5: [
        {
          chainId: 5,
          recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
          tokenId: 100,
          amount: BigNumber.from('10'),
          logId: 1,
        },
      ],
      80001: [
        {
          chainId: 80001,
          recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
          tokenId: 100,
          amount: BigNumber.from('10'),
          logId: 2,
        },
        {
          chainId: 80001,
          recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
          tokenId: 110,
          amount: BigNumber.from('10'),
          logId: 3,
        },
      ],
    })
  })
})
