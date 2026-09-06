import { describe, expect, it } from 'vitest'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { ChatSessionBodyKey } from '@/shared/chat/core/constants/chat-session'
import { patchChatSessionBodySchema } from '@/shared/chat/core/io/chat-session-contract'
import { chatSessionPatchBody } from '@/shared/chat/core/io/chat-sessions.api'

describe('PATCH chat session contract', () => {
  it('cannot change moduleId', () => {
    const parsed = patchChatSessionBodySchema.safeParse({
      [ChatSessionBodyKey.ModuleId]: AppModuleId.LoopCreator,
      [ChatSessionBodyKey.Title]: 'ok',
    })
    expect(parsed.success).toBe(false)
    expect(chatSessionPatchBody({ [ChatSessionBodyKey.Title]: 'Renamed' })).toEqual({
      title: 'Renamed',
    })
  })
})
