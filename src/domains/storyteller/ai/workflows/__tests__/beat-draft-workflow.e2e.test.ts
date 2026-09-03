/**
 * workflow-full tier (item 43): the beat-draft pipeline end to end with REAL
 * agents and the REAL database — local-only, excluded from `test:unit`
 * (`*.e2e.test.ts`). Run explicitly when `.env.local` keys + DB are available:
 *
 *   npx vitest run src/domains/storyteller/ai/workflows/__tests__/beat-draft-workflow.e2e.test.ts
 *
 * Needs: DATABASE_URL, an LLM key for the configured role models, and
 * WORKFLOW_E2E_PROJECT_ID / WORKFLOW_E2E_EPISODE_ID pointing at a scratch
 * project (beats created here are deleted afterwards).
 *
 * Two assertions the mechanics tier cannot make:
 *   1. Full pipeline (autoApprove) persists a real beat.
 *   2. Real critics QUOTE a planted cliché (discipline holds against a live model).
 */

import { afterAll, describe, expect, it } from 'vitest'
import { Mastra } from '@mastra/core/mastra'
import {
  createBeatDraftWorkflow,
  defaultBeatDraftDeps,
} from '../beat-draft-workflow'
import { beatDraftOutputSchema } from '../beat-draft-contract'

const projectId = process.env.WORKFLOW_E2E_PROJECT_ID
const episodeId = process.env.WORKFLOW_E2E_EPISODE_ID
const hasLlmKey = Boolean(
  process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY
)
const ready = Boolean(process.env.DATABASE_URL && hasLlmKey && projectId && episodeId)

const PLANTED_CLICHE = 'her heart pounded in her chest'

function makeWorkflow(deps = defaultBeatDraftDeps) {
  const workflow = createBeatDraftWorkflow(deps)
  void new Mastra({ workflows: { beatDraftWorkflow: workflow } })
  return workflow
}

const createdBeatIds: string[] = []

afterAll(async () => {
  if (createdBeatIds.length === 0) return
  const { db } = await import('@/db/client')
  const { beats } = await import('@/db/schema')
  const { inArray } = await import('drizzle-orm')
  await db.delete(beats).where(inArray(beats.id, createdBeatIds))
})

describe.runIf(ready)('beat-draft-workflow full tier (LLM + DB)', () => {
  it(
    'runs plan → draft → critics → revise with autoApprove and persists the beat',
    { timeout: 900_000 },
    async () => {
      const workflow = makeWorkflow()
      const run = await workflow.createRun()
      const result = await run.start({
        inputData: {
          // runIf(ready) guarantees these at runtime; the type is env-optional.
          projectId: projectId ?? '',
          episodeId: episodeId ?? '',
          brief:
            'Vera confronts Marcus in the chapel about the forged ledger; the confession must implicate Vera herself by the end.',
          characters: ['Vera', 'Marcus'],
          autoApprove: true,
        },
      })

      expect(result.status).toBe('success')
      if (result.status !== 'success') return
      const output = beatDraftOutputSchema.parse(result.result)
      expect(output.killed).toBe(false)
      expect(output.saved).toBe(true)
      expect(output.beatId).toBeTruthy()
      expect(output.finalDraft.length).toBeGreaterThan(100)
      if (output.beatId) createdBeatIds.push(output.beatId)
    }
  )

  it(
    'real critics quote a planted cliché without rewriting it',
    { timeout: 300_000 },
    async () => {
      // Real critics, canned draft: overriding draftBeat is the only way to
      // GUARANTEE the cliché is present for the critics to catch.
      const plantedDraft = `INT. CHAPEL — DUSK

Vera slid the ledger across the rail. ${PLANTED_CLICHE} as Marcus reached for it.

MARCUS
  You already know what I did.
  (subtext: he is testing what she can prove)

VERA
  I know what you signed.
  (subtext: so did she)`

      const canon =
        'CANON: Vera and Marcus are rival stewards of the same house. The ledger is forged.'
      const critiques = (
        await Promise.all([
          defaultBeatDraftDeps.critiqueContinuity(plantedDraft, canon),
          defaultBeatDraftDeps.critiqueProse(plantedDraft, canon),
          defaultBeatDraftDeps.critiqueStakes(plantedDraft, canon),
        ])
      ).join('\n')

      // Discipline: the planted cliché must be quoted…
      expect(critiques.toLowerCase()).toContain(PLANTED_CLICHE)
      // …and no critic may offer replacement prose.
      const lower = critiques.toLowerCase()
      for (const marker of ['instead, try', 'rewrite it as', 'you could write', 'replace it with']) {
        expect(lower).not.toContain(marker)
      }
    }
  )
})

describe.runIf(!ready)('beat-draft-workflow full tier (skipped)', () => {
  it('skips without DATABASE_URL, an LLM key, and WORKFLOW_E2E_PROJECT_ID/EPISODE_ID', () => {
    expect(ready).toBe(false)
  })
})
