import { describe, expect, it } from 'vitest'
import {
  OPENROUTER_MODEL_OPTION_IDS,
  OPENROUTER_MODEL_ID_MAX_LENGTH,
  isOpenRouterModelId,
} from '@/shared/agent-kernel/constants/model-settings'

describe('isOpenRouterModelId', () => {
  it('accepts every curated option', () => {
    for (const id of OPENROUTER_MODEL_OPTION_IDS) {
      expect(isOpenRouterModelId(id)).toBe(true)
    }
  })

  it('accepts ids outside the curated list — the point of the free-text field', () => {
    expect(isOpenRouterModelId('qwen/qwen3-max')).toBe(true)
    expect(isOpenRouterModelId('meta-llama/llama-4.1-405b-instruct')).toBe(true)
    expect(isOpenRouterModelId('openai/gpt-5.6-luna:nitro')).toBe(true)
  })

  it('accepts the already-gatewayed three-segment form', () => {
    expect(isOpenRouterModelId('openrouter/anthropic/claude-sonnet-5')).toBe(true)
  })

  it('tolerates surrounding whitespace', () => {
    expect(isOpenRouterModelId('  openai/gpt-5.6-luna  ')).toBe(true)
  })

  it('rejects anything that is not provider/model', () => {
    expect(isOpenRouterModelId('')).toBe(false)
    expect(isOpenRouterModelId('   ')).toBe(false)
    expect(isOpenRouterModelId('gpt-5.6-luna')).toBe(false)
    expect(isOpenRouterModelId('openai:gpt-5.6-luna')).toBe(false)
    expect(isOpenRouterModelId('/gpt-5.6-luna')).toBe(false)
    expect(isOpenRouterModelId('openai/')).toBe(false)
    expect(isOpenRouterModelId('a/b/c/d')).toBe(false)
  })

  it('rejects injection-shaped input', () => {
    expect(isOpenRouterModelId('openai/gpt-5.6-luna?x=1')).toBe(false)
    expect(isOpenRouterModelId('openai/gpt 4o')).toBe(false)
    expect(isOpenRouterModelId('../../etc/passwd')).toBe(false)
    expect(isOpenRouterModelId('https://evil.test/x')).toBe(false)
  })

  it('rejects ids past the length cap', () => {
    const long = `openai/${'x'.repeat(OPENROUTER_MODEL_ID_MAX_LENGTH)}`
    expect(isOpenRouterModelId(long)).toBe(false)
  })
})
