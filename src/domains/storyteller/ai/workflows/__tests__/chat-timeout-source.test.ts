import { describe, expect, it } from 'vitest'
import {
  CHAT_AUTHOR_GENERATE_TIMEOUT_MS,
  CHAT_ROUTE_MAX_DURATION_SECONDS,
  CHAT_STUCK_TIMEOUT_MS,
} from '@/shared/chat/core/constants/chat-timeouts'
import { GENERATION_STUCK_TIMEOUT_MS } from '@/shared/chat/assistant/use-assistant-pending-prompt'
import { BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS } from '@/domains/storyteller/ai/workflows/constants/beat-draft-workflow'

describe('storyteller chat timeout source', () => {
  it('derives client, route, and author budgets from one shared stuck window', () => {
    expect(GENERATION_STUCK_TIMEOUT_MS).toBe(CHAT_STUCK_TIMEOUT_MS)
    expect(CHAT_ROUTE_MAX_DURATION_SECONDS).toBe(180)
    expect(CHAT_ROUTE_MAX_DURATION_SECONDS * 1000).toBe(CHAT_STUCK_TIMEOUT_MS)
    expect(BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS).toBe(CHAT_AUTHOR_GENERATE_TIMEOUT_MS)
    expect(BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS).toBeLessThan(CHAT_STUCK_TIMEOUT_MS)
  })
})
