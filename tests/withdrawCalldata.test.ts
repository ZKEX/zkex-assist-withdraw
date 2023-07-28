import { parseEther } from 'ethers/lib/utils'
import { decodeWithdrawData, encodeWithdrawData } from '../src/utils/withdrawal'

describe('handle withdraw calldata', () => {
  it('encode withdraw data', () => {
    const calldata = encodeWithdrawData(
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
      1,
      parseEther('1')
    )
    expect(calldata).toBe(
      '0x2f25807e000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000'
    )
  })

  it('decode withdraw data', () => {
    const data = decodeWithdrawData(
      '0x2f25807e000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000de0b6b3a7640000'
    )
    expect(data.recepient.toLowerCase()).toBe(
      '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
    )
    expect(data.tokenId).toBe(1)
    expect(data.amount.toString()).toBe(parseEther('1').toString())
  })
})
