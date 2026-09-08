import { describe, expect, it } from 'vitest'
import {
  HALLUCINATION_JUDGE_PROMPT,
  MAGIC_JUDGE_PROMPT,
  PERSONA_FIDELITY_JUDGE_PROMPT,
  TOOL_USAGE_PROMPT,
} from '../registry-evaluation-prompts'

const JSON_INSTRUCTION = 'valid JSON'

describe('evaluation judge prompts', () => {
  it('do not embed JSON response templates', () => {
    expect(TOOL_USAGE_PROMPT.text).not.toContain(JSON_INSTRUCTION)
    expect(MAGIC_JUDGE_PROMPT.text).not.toContain(JSON_INSTRUCTION)
    expect(HALLUCINATION_JUDGE_PROMPT.text).not.toContain(JSON_INSTRUCTION)
    expect(PERSONA_FIDELITY_JUDGE_PROMPT.text).not.toContain(JSON_INSTRUCTION)
  })
})
