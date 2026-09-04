import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { INHERITED_AGENT_LAST_MESSAGES } from '@/shared/agent-kernel/mastra/studio-memory'
import { MemorySlot, memoryRef } from '@/shared/agent-kernel/mastra/memory-ref'

const USER = 'user-1'

enum LiveDoor {
  Assistant = 'src/app/api/assistant/[agentId]/route.ts',
  Stream = 'src/app/api/storyteller/chat/stream/stream-post-handler.ts',
  Controller = 'src/app/api/storyteller/chat/stream/controller-stream-wire.ts',
  Autonomous = 'src/app/api/storyteller/autonomous/route.ts',
  Crud = 'src/domains/storyteller/services/storyteller-crud-service.ts',
  ControllerCli = 'scripts/storyteller-controller-cli.ts',
  McpAgent = 'src/mcp/agent.ts',
}

describe('memoryRef', () => {
  it('isolates two projects for the same user', () => {
    const a = memoryRef({ projectId: 'proj-a', episodeId: 'ep-1', userId: USER })
    const b = memoryRef({ projectId: 'proj-b', episodeId: 'ep-1', userId: USER })
    expect(a.thread).not.toBe(b.thread)
    expect(a.resource).toBe(USER)
    expect(b.resource).toBe(USER)
  })

  it('uses the empty-slot sentinel when episode is missing', () => {
    const ref = memoryRef({ projectId: 'proj-a', userId: USER })
    expect(ref.thread).toContain(`:${MemorySlot.None}:`)
  })
})

describe('live memory doors', () => {
  it('binds thread and resource through memoryRef on every chat door', () => {
    const doors = [
      LiveDoor.Assistant,
      LiveDoor.Stream,
      LiveDoor.Controller,
      LiveDoor.Autonomous,
      LiveDoor.Crud,
      LiveDoor.ControllerCli,
    ]
    for (const file of doors) {
      const src = readFileSync(file, 'utf8')
      expect(src, file).toContain('from \'@/shared/agent-kernel/mastra/memory-ref\'')
      expect(src, file).toContain('memoryRef(')
    }
  })

  it('passes memory into handleChatStream on the assistant route', () => {
    const src = readFileSync(LiveDoor.Assistant, 'utf8')
    expect(src).toContain('handleChatStream(')
    expect(src).toContain('memory: { thread: bound.thread, resource: bound.resource }')
  })

  it('binds the controller session to the helper thread, not tags alone', () => {
    const src = readFileSync(LiveDoor.Controller, 'utf8')
    expect(src).toContain('threadId: bound.thread')
    expect(src).toContain('resourceId: bound.resource')
  })

  it('passes memory into the CRUD agent run', () => {
    const src = readFileSync(LiveDoor.Crud, 'utf8')
    expect(src).toContain('memory: { thread: threadId, resource: bound.resource }')
    expect(src).not.toContain('thread_${Date.now()')
  })

  it('applies a lastMessages bound on the MCP agent', () => {
    expect(INHERITED_AGENT_LAST_MESSAGES).toBeGreaterThan(0)
    expect(readFileSync(LiveDoor.McpAgent, 'utf8')).toContain(
      'lastMessages: INHERITED_AGENT_LAST_MESSAGES',
    )
  })
})
