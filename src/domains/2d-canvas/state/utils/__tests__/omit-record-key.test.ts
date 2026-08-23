import { describe, expect, it } from 'vitest'
import { omitRecordKey } from '../omit-record-key'

describe('omitRecordKey', () => {
  it('omits specified key from record', () => {
    const record = { a: 1, b: 2, c: 3 }
    const result = omitRecordKey(record, 'b')

    expect(result).toEqual({ a: 1, c: 3 })
    expect(result).not.toBe(record) // Ensures a new object is returned
    expect(record).toEqual({ a: 1, b: 2, c: 3 }) // Ensures original is not mutated
  })

  it('returns exact copy if key does not exist', () => {
    const record = { x: 'hello', y: 'world' }
    const result = omitRecordKey(record, 'z')

    expect(result).toEqual({ x: 'hello', y: 'world' })
    expect(result).not.toBe(record)
  })

  it('handles empty record', () => {
    const record: Record<string, number> = {}
    const result = omitRecordKey(record, 'nonexistent')

    expect(result).toEqual({})
  })

  it('correctly handles coordinate string keys ("x,y")', () => {
    const tiles = {
      '0,0': { id: 'tile-0' },
      '0,1': { id: 'tile-1' },
      '1,0': { id: 'tile-2' },
    }
    const result = omitRecordKey(tiles, '0,1')

    expect(result).toEqual({
      '0,0': { id: 'tile-0' },
      '1,0': { id: 'tile-2' },
    })
    expect(result['0,1']).toBeUndefined()
  })

  it('handles record with single key resulting in empty record', () => {
    const record = { onlyKey: true }
    const result = omitRecordKey(record, 'onlyKey')

    expect(result).toEqual({})
  })
})
