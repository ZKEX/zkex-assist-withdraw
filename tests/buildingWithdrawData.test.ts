import {
  compressAddress,
  decodeWithdrawData,
  decodeWithdrawalLog,
  encodeWithdrawData,
} from '../src/utils/withdrawal'

const dataHex =
  '0x2f25807e000000000000000000000000333333333333333333333333333333333333333300000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000001'
describe('building withdraw data', () => {
  it('compress address', () => {
    const address = compressAddress(
      '0x000000000000000000000000086cacda48e8a77680ba1e79177d1655f7130c95'
    )
    expect(address).toBe('0x086cacda48e8a77680ba1e79177d1655f7130c95')
  })

  it('decode withdrawal log', () => {
    const data = decodeWithdrawalLog(
      '0x00000000000000000000000000000000000000000000000000044364c5bb0000',
      [
        '0x3cfb74f0f066330f203d8ac39c3fef52fc056de4d011fc7d91dadd9ba6983416',
        '0x0000000000000000000000000000000000000000000000000000000000000012',
        '0x00000000000000000000000047140578cb9f0554d1d83e28c5d1c5d6ad95a90a',
      ]
    )
    expect(data).toMatchObject([
      18n,
      '0x00000000000000000000000047140578cb9f0554d1d83e28c5d1c5d6ad95a90a',
      1200000000000000n,
    ])
  })

  it(`encode withdraw data`, () => {
    const data = encodeWithdrawData(
      '0x3333333333333333333333333333333333333333',
      1,
      1n
    )
    expect(data).toBe(dataHex)
  })

  it(`decode withdraw data`, () => {
    const data = decodeWithdrawData(dataHex)
    expect(data).toMatchObject({
      recepient: '0x3333333333333333333333333333333333333333',
      tokenId: 1n,
      amount: 1n,
    })
  })
})
