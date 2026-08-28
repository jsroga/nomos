/**
 * The point of parsing at import is that a misconfigured environment fails at
 * boot naming what is wrong, instead of surfacing later as `undefined`.
 *
 * No *server* key is required today — `DATABASE_URL` was a candidate until
 * `create-mastra.ts` turned out to run without it — so parsing the real
 * environment cannot fail and asserting against `serverEnvSchema` would prove
 * nothing. These test the reporting itself, which is the part worth proving.
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseEnv } from '@/shared/config/env'
import { ENV_PARSE_FAILED } from '@/shared/config/constants/env'

const schema = z.object({
  REQUIRED_ONE: z.string().min(1),
  REQUIRED_TWO: z.string().min(1),
  OPTIONAL_ONE: z.string().min(1).optional(),
})

describe('parseEnv', () => {
  it('returns the parsed values when everything required is present', () => {
    const parsed = parseEnv(schema, { REQUIRED_ONE: 'a', REQUIRED_TWO: 'b' })

    expect(parsed.REQUIRED_ONE).toBe('a')
    expect(parsed.OPTIONAL_ONE).toBeUndefined()
  })

  it('names every missing key at once, not just the first', () => {
    expect(() => parseEnv(schema, {})).toThrow(/REQUIRED_ONE[\s\S]*REQUIRED_TWO/)
  })

  it('leads with a message that says what kind of failure this is', () => {
    expect(() => parseEnv(schema, {})).toThrow(ENV_PARSE_FAILED)
  })

  it('rejects an empty string, which is how a half-filled .env presents', () => {
    expect(() => parseEnv(schema, { REQUIRED_ONE: '', REQUIRED_TWO: 'b' })).toThrow('REQUIRED_ONE')
  })
})
