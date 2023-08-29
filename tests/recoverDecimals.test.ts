import { recoveryDecimals } from '../src/utils/zklink'

describe('recover decimals', () => {
  it('decimals 18', () => {
    const balance = recoveryDecimals(500000000000n, 18n)
    expect(balance.toString()).toBe('500000000000')
  })

  it('decimals 7', () => {
    const balance = recoveryDecimals(500000000000n, 7n)
    expect(balance.toString()).toBe('5')
  })

  it('decimals 6', () => {
    const balance = recoveryDecimals(500000000000n, 6n)
    expect(balance.toString()).toBe('0')
  })
})
