import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SystemScopeReason, systemScope } from '@/shared/auth/project-scope'
import { LlmFinishReason } from '@/shared/ai/gateway/constants/output-budget'
import { SCRIPT_EDIT_INCOMPLETE, SCRIPT_EDIT_SELECTION_MAX_CHARS } from '../constants/script-operations'

const { complete } = vi.hoisted(() => ({ complete: vi.fn() }))
vi.mock('@/shared/ai/gateway', () => ({ complete }))

import { regenerateText } from '../script-operations-service'

const SERVICE = 'src/domains/storyteller/services/script-operations-service.ts'
const SCOPE = systemScope('11111111-1111-4111-8111-111111111111', SystemScopeReason.ProviderSmoke)

describe('script-operations-service spend path', () => {
  it('does not import createStorytellerAgent', () => {
    const source = readFileSync(SERVICE, 'utf8')
    expect(source).not.toMatch(/createStorytellerAgent/)
  })
})

describe('regenerateText output bounds', () => {
  beforeEach(() => {
    complete.mockReset()
  })

  it('caps a selection at 12000 characters', () => {
    expect(SCRIPT_EDIT_SELECTION_MAX_CHARS).toBe(12_000)
  })

  it('returns edited text on a complete stop', async () => {
    complete.mockResolvedValue({ text: ' rewritten ', finishReason: LlmFinishReason.Stop })
    await expect(regenerateText(SCOPE, 'old line', 'tighten')).resolves.toBe('rewritten')
  })

  it('throws when the model returns empty text', async () => {
    complete.mockResolvedValue({ text: '   ', finishReason: LlmFinishReason.Stop })
    await expect(regenerateText(SCOPE, 'old line', 'tighten')).rejects.toThrow(SCRIPT_EDIT_INCOMPLETE)
  })

  it('throws when finishReason is length', async () => {
    complete.mockResolvedValue({ text: 'cut off', finishReason: LlmFinishReason.Length })
    await expect(regenerateText(SCOPE, 'old line', 'expand')).rejects.toThrow(SCRIPT_EDIT_INCOMPLETE)
  })
})
