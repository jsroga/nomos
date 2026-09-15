import { describe, expect, it } from 'vitest'
import { stringifyCanonJson } from '../fix-inconsistencies-json'
import {
  FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY,
  FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT,
} from '../constants/fix-inconsistencies-workflow'

describe('stringifyCanonJson', () => {
  it('uses the fallback when the value is undefined', () => {
    expect(stringifyCanonJson(undefined, FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT)).toBe(
      FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT,
    )
    expect(stringifyCanonJson(undefined, FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY)).toBe(
      FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY,
    )
  })

  it('stringifies objects, arrays, and null', () => {
    expect(stringifyCanonJson({ a: 1 }, FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT)).toBe('{"a":1}')
    expect(stringifyCanonJson([], FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY)).toBe('[]')
    expect(stringifyCanonJson(null, FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT)).toBe('null')
  })
})
