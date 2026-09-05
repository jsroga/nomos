import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const SERVICE = 'src/domains/storyteller/services/script-operations-service.ts'

describe('script-operations-service spend path', () => {
  it('does not import createStorytellerAgent', () => {
    const source = readFileSync(SERVICE, 'utf8')
    expect(source).not.toMatch(/createStorytellerAgent/)
  })
})
