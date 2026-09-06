import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { STORYTELLER_SCORERS } from '../index'
import {
  CHAT_HTTP_SCORERS,
  CHAT_LIVE_GOAL_SAMPLE_RATE,
  CHAT_LIVE_QUALITY_SAMPLE_RATE,
  CHAT_LIVE_SCORERS,
  ChatLiveScorerSamplingType,
} from '../chat-live-scorers'

enum HttpChatScorerSource {
  Agent = 'src/domains/storyteller/ai/agents/StorytellerAgent/storyteller-agent.ts',
  Runtime = 'src/domains/storyteller/core/io/mastra-runtime.ts',
  Assistant = 'src/app/api/assistant/[agentId]/route.ts',
}

describe('CHAT_LIVE_SCORERS', () => {
  it('keeps goal-reached sampling for eval / Studio Evaluate only', () => {
    expect(CHAT_LIVE_SCORERS.goalReached.scorer.id).toBe('goal-reached')
    expect(CHAT_LIVE_SCORERS.goalReached.sampling).toEqual({
      type: ChatLiveScorerSamplingType.Ratio,
      rate: CHAT_LIVE_GOAL_SAMPLE_RATE,
    })
    expect(CHAT_LIVE_SCORERS.hallucination.scorer.id).toBe('hallucination')
    expect(CHAT_LIVE_SCORERS.magic.scorer.id).toBe('magic')
    expect(CHAT_LIVE_SCORERS.proseCraft.scorer.id).toBe('prose-craft')
    expect(CHAT_LIVE_SCORERS.hallucination.sampling).toEqual({
      type: ChatLiveScorerSamplingType.Ratio,
      rate: CHAT_LIVE_QUALITY_SAMPLE_RATE,
    })
    expect(CHAT_LIVE_QUALITY_SAMPLE_RATE).toBeGreaterThanOrEqual(0.1)
    expect(CHAT_LIVE_QUALITY_SAMPLE_RATE).toBeLessThanOrEqual(0.3)
  })

  it('registers the same quality judges on createMastra for Trace Evaluate', () => {
    expect(STORYTELLER_SCORERS.hallucination.id).toBe('hallucination')
    expect(STORYTELLER_SCORERS.magic.id).toBe('magic')
    expect(STORYTELLER_SCORERS['prose-craft'].id).toBe('prose-craft')
    expect(STORYTELLER_SCORERS['goal-reached'].id).toBe('goal-reached')
  })

  it('does not attach live LLM judges to HTTP chat or e2e smoke', () => {
    expect(CHAT_HTTP_SCORERS).toEqual({})
    for (const path of Object.values(HttpChatScorerSource)) {
      const source = readFileSync(path, 'utf8')
      expect(source).toContain('CHAT_HTTP_SCORERS')
      expect(source).not.toContain('scorers: CHAT_LIVE_SCORERS')
    }
  })
})
