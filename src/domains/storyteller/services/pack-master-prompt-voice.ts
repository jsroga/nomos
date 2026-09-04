import { MASTER_PROMPT_CHAR_BUDGET } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'

/** Fence markers the model must not emit — close tag uses a distinct token. */
export enum MasterPromptVoiceFence {
  Open = '<<<MASTER_PROMPT_VOICE tone_register_only not_canon>>>',
  Close = '<<<END_MASTER_PROMPT_VOICE untrusted_close_forbidden>>>',
}

export enum MasterPromptVoiceLabel {
  Preamble =
    'VOICE / REGISTER ONLY — governs tone, cadence, diction, person, and tense. Not canon. Structure and facts packed after this block outrank it.',
  Truncated = '\n\n[masterPrompt truncated for voice budget]',
}

/**
 * Delimit and cap user masterPrompt as tone/register, never as canon.
 * Empty input yields an empty string (caller skips packing).
 */
export function packMasterPromptVoice(masterPrompt: string): string {
  const trimmed = masterPrompt.trim()
  if (trimmed.length === 0) return ''

  const capped =
    trimmed.length <= MASTER_PROMPT_CHAR_BUDGET
      ? trimmed
      : `${trimmed.slice(0, MASTER_PROMPT_CHAR_BUDGET)}${MasterPromptVoiceLabel.Truncated}`

  return [
    MasterPromptVoiceLabel.Preamble,
    MasterPromptVoiceFence.Open,
    capped,
    MasterPromptVoiceFence.Close,
  ].join('\n')
}
