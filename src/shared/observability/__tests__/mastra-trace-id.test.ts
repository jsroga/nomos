import { describe, expect, it } from 'vitest'
import { createMastraTraceId, normalizeMastraTraceId } from '../mastra-trace-id'

const UUID_DASHED = '550e8400-e29b-41d4-a716-446655440000'
const HEX32 = '0123456789abcdef0123456789abcdef'

describe('createMastraTraceId', () => {
  it('returns 32 hex characters without dashes', () => {
    const id = createMastraTraceId()
    expect(id).toMatch(/^[0-9a-f]{32}$/)
    expect(id).not.toContain('-')
  })
})

describe('normalizeMastraTraceId', () => {
  it('strips UUID dashes to 32 hex', () => {
    expect(normalizeMastraTraceId(UUID_DASHED)).toBe('550e8400e29b41d4a716446655440000')
  })

  it('keeps a valid hex id', () => {
    expect(normalizeMastraTraceId(HEX32)).toBe(HEX32)
  })

  it('mints a new hex id for junk', () => {
    const id = normalizeMastraTraceId('not-a-trace')
    expect(id).toMatch(/^[0-9a-f]{32}$/)
  })
})
