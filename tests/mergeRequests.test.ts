import { BigNumber } from 'ethers'
import {
  WithdrawalRequestParams,
  mergeEventRequestParams,
} from '../src/utils/withdrawal'

describe('merge requests', () => {
  it('merge same logs', () => {
    const hasSameLogs: WithdrawalRequestParams[] = [
      {
        chainId: 80001,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 100,
        amount: BigNumber.from('100'),
        logId: 1,
      },
      {
        chainId: 80001,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 100,
        amount: BigNumber.from('100'),
        logId: 2,
      },
      {
        chainId: 80001,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 101,
        amount: BigNumber.from('100'),
        logId: 3,
      },
      {
        chainId: 80001,
        recepient: '0x3498F456645270eE003441df82C718b56c0e6666',
        tokenId: 100,
        amount: BigNumber.from('100'),
        logId: 4,
      },
      {
        chainId: 80001,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 100,
        amount: BigNumber.from('0'),
        logId: 5,
      },
    ]
    const r = mergeEventRequestParams(hasSameLogs)

    expect(r).toMatchObject([
      {
        chainId: 80001,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 100,
        amount: BigNumber.from('200'),
        logId: 5,
      },
      {
        chainId: 80001,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 101,
        amount: BigNumber.from('100'),
        logId: 3,
      },
      {
        chainId: 80001,
        recepient: '0x3498F456645270eE003441df82C718b56c0e6666',
        tokenId: 100,
        amount: BigNumber.from('100'),
        logId: 4,
      },
    ])
  })

  it('drop log when amount is zero', () => {
    const hasZeroAmountLogs: WithdrawalRequestParams[] = [
      {
        chainId: 5,
        recepient: '0x086cacda48e8a77680ba1e79177d1655f7130c95',
        tokenId: 100,
        amount: BigNumber.from('0'),
        logId: 1,
      },
      {
        chainId: 80001,
        recepient: '0x3498F456645270eE003441df82C718b56c0e6666',
        tokenId: 110,
        amount: BigNumber.from('10'),
        logId: 2,
      },
    ]
    const r = mergeEventRequestParams(hasZeroAmountLogs)
    expect(r.length).toBe(1)
    expect(r[0].logId).toBe(2)
  })

  it(`Don't merge diff chain id`, () => {
    const hasZeroAmountLogs: WithdrawalRequestParams[] = [
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
    ]
    const r = mergeEventRequestParams(hasZeroAmountLogs)
    expect(r).toMatchObject(hasZeroAmountLogs)
  })
})
