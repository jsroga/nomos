import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SmokeBannedChatModel,
  SmokeBodyKey,
  SmokeChatModel,
} from '../../e2e/constants/storyteller-smoke'

enum SmokePinSource {
  Script = 'e2e/scenarios/storyteller-smoke.script.ts',
}

describe('e2e smoke chat model pin', () => {
  it('posts only GLM and never Kimi or GPT-5.6 Sol', () => {
    expect(SmokeChatModel.Glm).toBe('zai-coding-plan:glm-5.2')
    expect(Object.values(SmokeChatModel)).toEqual([SmokeChatModel.Glm])

    const script = readFileSync(SmokePinSource.Script, 'utf8')
    expect(script).toContain(`SmokeBodyKey.ModelName]: SmokeChatModel.Glm`)
    expect(script).not.toContain(SmokeBannedChatModel.Gpt56Sol)
    expect(script).not.toContain(SmokeBannedChatModel.KimiK3)
    expect(script).not.toContain(SmokeBannedChatModel.KimiK2)
  })
})
