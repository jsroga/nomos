import { describe, expect, it } from 'vitest'
import {
  ideaUniquenessScorer,
  ideaDiversityJudgeScorer,
} from '@/shared/agent-kernel/scorers'
import { scoreIdeaDiversity } from '@/shared/agent-kernel/scorers/idea-diversity-metrics-wire'
import { generateIdeaSets } from '@/evals/idea-diversity/generate-ideas-wire'
import { IdeaAgentId } from '@/evals/idea-diversity/types'
import { IDEA_DIVERSITY_DATASET } from '@/evals/datasets/idea-diversity-golden'

describe('scoreIdeaDiversity (deterministic metrics, no keys)', () => {
  it('scores empty set as zero', () => {
    const scores = scoreIdeaDiversity([])
    expect(scores.overall).toBe(0)
    expect(scores.reason).toContain('Empty')
  })

  it('penalizes exact duplicates', () => {
    const scores = scoreIdeaDiversity([
      'A dragon guards a vault of silence.',
      'A dragon guards a vault of silence.',
      'A dragon guards a vault of silence.',
    ])
    expect(scores.uniqueness).toBeLessThan(0.5)
    expect(scores.exactDuplicateRate).toBeGreaterThan(0.5)
  })

  it('rewards diverse concrete premises', () => {
    const scores = scoreIdeaDiversity([
      'A cartographer maps a city that redraws itself every midnight.',
      'Rival chefs duel using recipes that rewrite customers memories.',
      'Underground postal workers smuggle truths in undeliverable letters.',
      'Clockmakers repair timepieces that steal hours from sleep.',
    ])
    expect(scores.uniqueness).toBeGreaterThan(0.85)
    expect(scores.overall).toBeGreaterThan(0.6)
  })
})

describe('fixture agents × models generate idea sets', () => {
  it('emits one set per agent/model pair', () => {
    const sets = generateIdeaSets({ count: 6, seed: 7 })
    expect(sets).toHaveLength(4)
    for (const set of sets) {
      expect(set.ideas).toHaveLength(6)
      expect(set.prompt.length).toBeGreaterThan(10)
    }
  })
})

describe('ideaUniquenessScorer (deterministic Mastra scorer via scorer.run)', () => {
  it('scores a diverse set above a repetitive echo set', async () => {
    const sets = generateIdeaSets({ count: 8, seed: 42 })
    const diverse = sets.find(s => s.agentId === IdeaAgentId.DiverseBrainstormer)
    const echo = sets.find(s => s.agentId === IdeaAgentId.RepetitiveEcho)
    expect(diverse).toBeDefined()
    expect(echo).toBeDefined()
    if (!diverse || !echo) return

    const good = await ideaUniquenessScorer.run({
      input: { ideas: diverse.ideas },
      output: { ideas: diverse.ideas },
    })
    const bad = await ideaUniquenessScorer.run({
      input: { ideas: echo.ideas },
      output: { ideas: echo.ideas },
    })
    expect(good.score).toBeGreaterThan(bad.score ?? 0)
  })

  it('reads newline-separated ideas from the output text', async () => {
    const result = await ideaUniquenessScorer.run({
      input: {},
      output: '1. A lighthouse keeper archives storms.\n2. A tailor sews maps into coats.',
    })
    expect(result.score).toBeGreaterThan(0)
    expect(result.reason).toBeTruthy()
  })
})

describe('idea-diversity dataset + LLM judge scorer', () => {
  it('builds one dataset example per fixture agent, scoped to the idea scorers', () => {
    expect(IDEA_DIVERSITY_DATASET.examples).toHaveLength(4)
    for (const example of IDEA_DIVERSITY_DATASET.examples) {
      expect(Array.isArray(example.input.ideas)).toBe(true)
      expect(example.metadata.scorers).toEqual(['idea-uniqueness', 'idea-diversity-judge'])
      expect(example.referenceOutput.length).toBeGreaterThan(0)
    }
  })

  it('exposes the LLM judge as a standard Mastra scorer (stable id, in registry)', () => {
    expect(ideaDiversityJudgeScorer.id).toBe('idea-diversity-judge')
  })
})
