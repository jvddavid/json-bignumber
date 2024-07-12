import { JSONBig } from '@/index'
import { describe, expect, it } from '@jest/globals'
import BigNumber from 'bignumber.js'

describe('index.ts', () => {
  it('should be able to parse a big number', () => {
    const json = '{ "value" : 9223372036854775807, "v2": 123 }'
    const r1 = JSONBig.parse<{
      value: BigNumber
      v2: number
    }>(json)
    expect(r1.value.toString()).toBe('9223372036854775807')
    expect(r1.v2).toBe(123)
  })
  it('should be able to stringify a big number', () => {
    const r1 = JSONBig.stringify({
      value: BigNumber('9223372036854775807'),
      v2: 123
    })
    expect(r1).toBe('{"value":9223372036854775807,"v2":123}')
  })
})
