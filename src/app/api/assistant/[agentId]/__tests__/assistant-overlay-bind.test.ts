import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AssistantChatBodyKey } from '@/shared/chat/core/constants/assistant-thread-ui'

const ASSISTANT_ROUTE = 'src/app/api/assistant/[agentId]/route.ts'

describe('assistant overlay session bind', () => {
  it('loads overlay memory when sessionId is present and keeps memoryRef otherwise', () => {
    const src = readFileSync(ASSISTANT_ROUTE, 'utf8')
    expect(src).toContain('AssistantChatBodyKey.SessionId')
    expect(src).toContain('findOwnedChatSession')
    expect(src).toContain('overlayMemoryRef(')
    expect(src).toContain('memoryRef(')
    expect(src).toContain('memory: { thread: bound.thread, resource: bound.resource }')
    expect(src).toContain('scheduleChatSessionTitle(')
    expect(AssistantChatBodyKey.SessionId).toBe('sessionId')
  })
})
