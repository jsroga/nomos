import { describe, expect, it } from 'vitest'
import {
  CHAT_AUTHOR_GENERATE_TIMEOUT_MS,
  CHAT_ROUTE_MAX_DURATION_SECONDS,
  CHAT_STUCK_TIMEOUT_MS,
} from '@/shared/chat/core/constants/chat-timeouts'
import { GENERATION_STUCK_TIMEOUT_MS } from '@/shared/chat/assistant/use-assistant-pending-prompt'
import { BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS, BEAT_DRAFT_CRITIC_ROLES } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'
import { readFileSync } from 'node:fs'

describe('storyteller chat timeout source', () => {
  it('derives client, route, and author budgets from one shared stuck window', () => {
    expect(GENERATION_STUCK_TIMEOUT_MS).toBe(CHAT_STUCK_TIMEOUT_MS)
    expect(CHAT_ROUTE_MAX_DURATION_SECONDS).toBe(180)
    expect(CHAT_ROUTE_MAX_DURATION_SECONDS * 1000).toBe(CHAT_STUCK_TIMEOUT_MS)
    expect(BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS).toBe(CHAT_AUTHOR_GENERATE_TIMEOUT_MS)
    expect(BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS).toBeLessThan(CHAT_STUCK_TIMEOUT_MS)
  })

  it('keeps three parallel critics inside the 180s chat route budget', () => {
    expect(BEAT_DRAFT_CRITIC_ROLES).toHaveLength(3)
    expect(CHAT_ROUTE_MAX_DURATION_SECONDS).toBe(180)
  })

  it('pins chat and assistant route maxDuration to the same Next literal', () => {
    const literal = `export const maxDuration = ${CHAT_ROUTE_MAX_DURATION_SECONDS}`
    expect(readFileSync('src/app/api/storyteller/chat/stream/route.ts', 'utf8')).toContain(literal)
    expect(readFileSync('src/app/api/assistant/[agentId]/route.ts', 'utf8')).toContain(literal)
  })
})
