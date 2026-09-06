import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { E2E_MOCK_USER_EMAIL, E2E_MOCK_USER_ID } from '@/shared/auth/constants/e2e-auth'
import {
  E2eLlmPinError,
  E2eOpenRouterGateway,
  E2ePinnedChatModel,
} from '@/shared/ai/gateway/constants/e2e-llm-pin'
import {
  isE2eBannedModelId,
  isE2eHarnessCaller,
  isE2eLlmPinned,
  remapModelIdIfE2ePinned,
  withE2eLlmPin,
} from '@/shared/ai/gateway/e2e-llm-pin'
import { toMastraJudgingModel } from '@/shared/agent-kernel/scorers/shared'
import { TEXT_GEN_PRIMARY_MODEL, TEXT_GEN_SHORT_IMPACT_MODEL } from '@/shared/agent-kernel/models'

enum PinSource {
  StreamRoute = 'src/app/api/storyteller/chat/stream/route.ts',
  StreamHandler = 'src/app/api/storyteller/chat/stream/stream-post-handler.ts',
  Assistant = 'src/app/api/assistant/[agentId]/route.ts',
  ChatPost = 'src/app/api/storyteller/chat/chat-post-handler.ts',
  Auth = 'src/shared/auth/auth.ts',
  LoopAssistant = 'src/app/api/loop-creator/assistant/route.ts',
  LlmJudge = 'src/app/api/llm-judge/route.ts',
  PureModel = 'src/shared/agent-kernel/models.ts',
  SmokeConstants = 'e2e/constants/storyteller-smoke.ts',
}

enum HarnessProbe {
  OtherUser = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  HumanEmail = 'human@example.com',
  PlaywrightEmail = 'e2e-123-abc@example.com',
}

describe('e2e LLM pin', () => {
  it('recognizes bypass mock user, Playwright emails, and ignores ordinary callers', () => {
    expect(isE2eHarnessCaller({ userId: E2E_MOCK_USER_ID })).toBe(true)
    expect(isE2eHarnessCaller({ email: E2E_MOCK_USER_EMAIL })).toBe(true)
    expect(isE2eHarnessCaller({ email: HarnessProbe.PlaywrightEmail })).toBe(true)
    expect(isE2eHarnessCaller({ userId: HarnessProbe.OtherUser })).toBe(false)
    expect(isE2eHarnessCaller({ email: HarnessProbe.HumanEmail })).toBe(false)
  })

  it('bans Kimi and GPT-5.6 Sol ids', () => {
    expect(isE2eBannedModelId(TEXT_GEN_SHORT_IMPACT_MODEL)).toBe(true)
    expect(isE2eBannedModelId(TEXT_GEN_PRIMARY_MODEL)).toBe(true)
    expect(isE2eBannedModelId(E2ePinnedChatModel.CatalogId)).toBe(false)
    expect(isE2eBannedModelId(E2ePinnedChatModel.OpenRouterId)).toBe(false)
  })

  it('remaps banned ids to GLM only while pinned', () => {
    expect(remapModelIdIfE2ePinned(TEXT_GEN_PRIMARY_MODEL)).toBe(TEXT_GEN_PRIMARY_MODEL)
    expect(withE2eLlmPin(() => remapModelIdIfE2ePinned(TEXT_GEN_PRIMARY_MODEL))).toBe(
      E2ePinnedChatModel.OpenRouterId
    )
    expect(
      withE2eLlmPin(() =>
        remapModelIdIfE2ePinned(`${E2eOpenRouterGateway.Prefix}${TEXT_GEN_SHORT_IMPACT_MODEL}`)
      )
    ).toBe(E2ePinnedChatModel.GatewayId)
    expect(withE2eLlmPin(() => isE2eLlmPinned())).toBe(true)
    expect(remapModelIdIfE2ePinned(TEXT_GEN_PRIMARY_MODEL, E2E_MOCK_USER_ID)).toBe(
      E2ePinnedChatModel.OpenRouterId
    )
  })

  it('refuses live judges under the pin', () => {
    expect(() => withE2eLlmPin(() => toMastraJudgingModel())).toThrow(E2eLlmPinError.JudgingForbidden)
  })

  it('matches the smoke GLM catalog pin', () => {
    expect(readFileSync(PinSource.SmokeConstants, 'utf8')).toContain(
      `Glm = '${E2ePinnedChatModel.CatalogId}'`
    )
  })

  it('wires the pin onto HTTP chat doors', () => {
    for (const path of [PinSource.StreamRoute, PinSource.Assistant, PinSource.ChatPost, PinSource.LoopAssistant]) {
      expect(readFileSync(path, 'utf8')).toContain('withE2eLlmPin')
    }
    expect(readFileSync(PinSource.StreamHandler, 'utf8')).toContain('E2ePinnedChatModel.CatalogId')
    expect(readFileSync(PinSource.Auth, 'utf8')).toContain('applyE2eLlmPinIfHarness')
    expect(readFileSync(PinSource.LlmJudge, 'utf8')).toContain('E2eLlmPinError.JudgingForbidden')
    expect(readFileSync(PinSource.PureModel, 'utf8')).toContain('E2ePinnedChatModel.OpenRouterId')
  })
})
