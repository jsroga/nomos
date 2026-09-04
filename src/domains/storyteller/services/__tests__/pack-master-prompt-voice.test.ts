import { describe, expect, it } from 'vitest'
import { MASTER_PROMPT_CHAR_BUDGET } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'
import {
  MasterPromptVoiceFence,
  MasterPromptVoiceLabel,
  packMasterPromptVoice,
} from '@/domains/storyteller/services/pack-master-prompt-voice'

describe('packMasterPromptVoice', () => {
  it('returns empty for blank input', () => {
    expect(packMasterPromptVoice('')).toBe('')
    expect(packMasterPromptVoice('   ')).toBe('')
  })

  it('fences tone/register and caps at MASTER_PROMPT_CHAR_BUDGET', () => {
    const body = 'x'.repeat(MASTER_PROMPT_CHAR_BUDGET + 50)
    const packed = packMasterPromptVoice(body)
    expect(packed).toContain(MasterPromptVoiceFence.Open)
    expect(packed).toContain(MasterPromptVoiceFence.Close)
    expect(packed).toContain(MasterPromptVoiceLabel.Preamble)
    expect(packed).toContain(MasterPromptVoiceLabel.Truncated)
    expect(packed.includes(body)).toBe(false)
    expect(packed).toContain('x'.repeat(MASTER_PROMPT_CHAR_BUDGET))
  })
})
