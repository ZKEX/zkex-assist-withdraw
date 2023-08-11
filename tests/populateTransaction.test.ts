import { populateTransaction } from '../src/parallel'

describe('populate transaction', () => {
  it('requests equal 1', async () => {
    const chainId = 80001
    const calldata = '0x0000000001'
    const mainContract = '0x9355649a739D6E583aFBfc1b4bb2F14937D67eCb'
    const callback = populateTransaction(chainId, mainContract, '')
    const tx = await callback([
      {
        functionData: calldata,
        chainId: chainId,
      },
    ])
    expect(tx.to).toBe(mainContract)
    // expect(tx.gasLimit.toString()).toBe(SUBMITTER_GAS_LIMIT)
    expect(tx.data).toBe(calldata)
    expect(tx.maxFeePerGas).not.toBeUndefined()
    expect(tx.maxPriorityFeePerGas).not.toBeUndefined()
    expect(tx.gasPrice).toBeUndefined()
  })

  it('requests great than 1', async () => {
    const chainId = 80001
    const calldata = '0x0000000001'
    const mainContract = '0x9355649a739D6E583aFBfc1b4bb2F14937D67eCb'
    const multipleContract = '0x0000000000000000000000000000000000000000'
    const callback = populateTransaction(
      chainId,
      mainContract,
      multipleContract
    )
    const tx = await callback([
      {
        functionData: calldata,
        chainId: chainId,
      },
    ])
    expect(tx.to).toBe(mainContract)
    // expect(tx.gasLimit.toString()).toBe(SUBMITTER_GAS_LIMIT)
    expect(tx.data).toBe(calldata)
    expect(tx.maxFeePerGas).not.toBeUndefined()
    expect(tx.maxPriorityFeePerGas).not.toBeUndefined()
    expect(tx.gasPrice).toBeUndefined()
  })
})
