import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  E2E_HARNESS_USER,
  authModuleStub,
  resetHarness,
  routeRequest,
  signIn,
} from '@/app/api/route-harness'
import { HttpMethod } from '@/shared/data/constants/protocol'
import { isPlainObject } from '@/shared/data/json-guards'

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
})
