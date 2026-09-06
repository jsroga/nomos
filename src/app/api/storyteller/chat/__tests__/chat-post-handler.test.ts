import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  E2E_HARNESS_USER,
  authModuleStub,
  resetHarness,
  routeRequest,
  signIn,
} from '@/app/api/route-harness'
import { HttpMethod } from '@/shared/data/constants/protocol'
import { isPlainObject } from '@/shared/data/json-guards'
import { FeatureFlag, isFeatureEnabled } from '@/shared/data/constants/feature-flags'

const start = vi.fn()

vi.mock('@/shared/auth/project-scope', () => ({
  tryProjectScope: async () => true,
}))
vi.mock('@/domains/storyteller/config/resolve-chat-model', () => ({
  resolveChatModelId: () => 'openai/gpt-5.6-luna',
}))
vi.mock('@/domains/storyteller/config/constants/chat-model-catalog', async importOriginal => {
  const actual =
    await importOriginal<typeof import('@/domains/storyteller/config/constants/chat-model-catalog')>()
  return { ...actual, isKnownChatModel: () => true }
})
vi.mock('@/shared/agent-kernel', () => ({
  getMastraInstance: () => ({
    getWorkflow: () => ({
      createRun: async () => ({ start }),
    }),
  }),
}))
vi.mock('@/shared/auth/auth', async () => authModuleStub())

import { handleStorytellerChatPost } from '../chat-post-handler'

beforeEach(() => {
  resetHarness()
  start.mockReset()
  start.mockResolvedValue({ status: 'failed' })
})

describe('handleStorytellerChatPost autoApprove', () => {
  it('does not pass autoApprove true', async () => {
    signIn(E2E_HARNESS_USER)
    await handleStorytellerChatPost(
      routeRequest({
        method: HttpMethod.Post,
        body: {
          message: 'Write the next beat',
          projectId: 'p1',
          episodeId: 'e1',
        },
      }),
      E2E_HARNESS_USER
    )
    expect(start).toHaveBeenCalled()
    const payload = start.mock.calls[0]?.[0]
    const inputData = isPlainObject(payload) && isPlainObject(payload.inputData) ? payload.inputData : null
    expect(inputData?.autoApprove).not.toBe(true)
  })

  it('does not hardcode autoApprove true on chat POST or stream routes', () => {
    const AutoApproveTrue = 'autoApprove: true'
    const sources = [
      'src/app/api/storyteller/chat/chat-post-handler.ts',
      'src/app/api/storyteller/chat/stream/route.ts',
      'src/app/api/storyteller/chat/stream/stream-post-handler.ts',
      'src/app/api/storyteller/chat/stream/stream-route-handler.ts',
      'src/app/api/storyteller/autonomous/route.ts',
    ]
    for (const path of sources) {
      expect(readFileSync(path, 'utf8')).not.toContain(AutoApproveTrue)
    }
  })

  it('keeps autonomous drafting off unless the env flag is exactly true', () => {
    const previous = process.env[FeatureFlag.StorytellerAutonomous]
    Reflect.deleteProperty(process.env, FeatureFlag.StorytellerAutonomous)
    expect(isFeatureEnabled(FeatureFlag.StorytellerAutonomous)).toBe(false)
    if (previous === undefined) Reflect.deleteProperty(process.env, FeatureFlag.StorytellerAutonomous)
    else process.env[FeatureFlag.StorytellerAutonomous] = previous
  })
})
