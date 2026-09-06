import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { AUTHOR_LABELLED_PLANS_DATASET } from '../datasets/author-labelled-plans'
import { TEXT_GEN_FAST_MODEL } from '@/shared/agent-kernel/models'

enum RolePinArtifact {
  File = 'evals/results/role-pin-decision.json',
}

describe('role pin decision', () => {
  it('records numbers without applying env pins', () => {
    const raw = readFileSync(join(process.cwd(), RolePinArtifact.File), 'utf8')
    const parsed: unknown = JSON.parse(raw)
    expect(parsed).toEqual(
      expect.objectContaining({
        pinned: false,
        liveQuality: null,
        labelledPlanStubs: AUTHOR_LABELLED_PLANS_DATASET.stubs.length,
      })
    )
    expect(raw).toContain(TEXT_GEN_FAST_MODEL)
  })

  it('does not freeze vendor ids in .spec or agent source', () => {
    const author = readFileSync('src/domains/storyteller/ai/agents/AutonomousAuthor/autonomous-author-agent.ts', 'utf8')
    expect(author).not.toContain('STORYTELLER_AUTHOR_MODEL=')
    const spec = readFileSync('.spec/opus/architecture-review/phases.md', 'utf8')
    expect(spec).not.toMatch(/STORYTELLER_AUTHOR_MODEL=\S+/)
  })
})
