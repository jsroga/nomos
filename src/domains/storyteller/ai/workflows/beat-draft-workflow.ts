/**
 * beat-draft-workflow — the GRRM quality pipeline (StoryForge port).
 *
 *   plan-beat (BeatPlanner, structured JSON)
 *     → draft-script (GrrmAuthor, script-beat format, toolChoice none)
 *     → critique (3 narrow critics in parallel — diagnose only)
 *     → editorial-verdict (SUSPENDS for the human: approve / revise / kill;
 *       state is snapshotted to Mastra storage, so the run survives restarts
 *       and can be resumed from the API route, Studio, or a script days later)
 *     → revise (same author — unified vision; editor note outranks critics)
 *
 * `autoApprove: true` skips the verdict gate (batch/eval mode).
 *
 * Dependencies are injected via `createBeatDraftWorkflow(deps)` so the
 * mechanics tests can drive suspend/resume without LLM calls or a database;
 * `beatDraftWorkflow` is the production instance with real agents.
 *
 * Critique runs the three critics via Promise.all inside one step — the
 * pattern proven against this exact Mastra version in the StoryForge PoC
 * (`.local/storyforge/src/mastra/workflows/chapter-workflow.ts`). Each critic
 * call still produces its own agent span in tracing.
 */

import '@/shared/data/server-guard'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { BeatPlanSchema } from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-schema'
import {
  assessBeatPlanConcreteness,
  formatPlanQualityFeedback,
} from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-quality'
import { formatSparksForPlanner } from '@/domains/storyteller/ai/agents/Muse/rank'
import { proseCraftScorer, stakesCostScorer } from '@/shared/agent-kernel/scorers'
import { defaultBeatDraftDeps } from './beat-draft-default-deps'
import type { BeatDraftContext, BeatDraftDeps } from './beat-draft-deps-types'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
  beatDraftInputSchema,
  beatDraftOutputSchema,
} from './beat-draft-contract'
import {
  BEAT_DRAFT_KILLED_MESSAGE,
  BEAT_DRAFT_VERDICT_NOTE_DESC,
  BEAT_DRAFT_VERDICT_SUSPEND_REASON,
  BeatDraftStepId,
  BeatDraftVerdictAction,
} from './constants/beat-draft-workflow'

/**
 * Craft scorers attached to the draft and revise steps (rate 1, StoryForge
 * pattern): scores land in Mastra storage / Studio Observability and answer
 * "did the revision beat the draft?" across prompt changes. Scoring is async
 * observability — a judge failure never fails the run.
 */
const RATIO_SAMPLING = 'ratio'
const CRAFT_STEP_SCORERS = {
  proseCraft: { scorer: proseCraftScorer, sampling: { type: RATIO_SAMPLING, rate: 1 } },
  stakesCost: { scorer: stakesCostScorer, sampling: { type: RATIO_SAMPLING, rate: 1 } },
} as const

export {
  beatDraftInputSchema,
  beatDraftOutputSchema,
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
}
export type { BeatDraftContext, BeatDraftDeps, PersistedBeat } from './beat-draft-deps-types'
export { defaultBeatDraftDeps } from './beat-draft-default-deps'

// ==========================================
// SCHEMAS (boundary schemas live in beat-draft-contract.ts)
// ==========================================

const planOutputSchema = beatDraftInputSchema.extend({
  canon: z.string(),
  beatPlan: BeatPlanSchema,
  /** Concreteness-gate failures that survived the single retry (usually empty). */
  planWarnings: z.array(z.string()),
  /** Kept Muse spark hooks (empty unless the run set wildcards: true). */
  sparks: z.array(z.string()),
})

const draftOutputSchema = planOutputSchema.extend({
  draft: z.string(),
})

const critiqueOutputSchema = draftOutputSchema.extend({
  critiques: z.string(),
})

const verdictOutputSchema = critiqueOutputSchema.extend({
  action: z.enum([
    BeatDraftVerdictAction.Approve,
    BeatDraftVerdictAction.Revise,
    BeatDraftVerdictAction.Kill,
  ]),
  note: z.string().optional(),
})

// ==========================================
// WORKFLOW FACTORY
// ==========================================

export function createBeatDraftWorkflow(deps: BeatDraftDeps = defaultBeatDraftDeps) {
  const planStep = createStep({
    id: BeatDraftStepId.PlanBeat,
    inputSchema: beatDraftInputSchema,
    outputSchema: planOutputSchema,
    execute: async ({ inputData }) => {
      const ctx: BeatDraftContext = {
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
        brief: inputData.brief,
        characters: inputData.characters,
      }
      const canon = await deps.assembleCanon(ctx)

      // Muse sparks (5.3): opt-in, never fatal — an empty result proceeds
      // sparkless. The planner must engage-or-reject each spark by number.
      const keptSparks = inputData.wildcards ? await deps.generateSparks(ctx, canon) : []
      const sparksBlock = keptSparks.length > 0 ? formatSparksForPlanner(keptSparks) : undefined

      let beatPlan = await deps.planBeat(ctx, canon, undefined, sparksBlock)
      let planWarnings: string[] = []

      // Concreteness gate: retry ONCE with the failures named; a second
      // failure passes through flagged rather than erroring the run.
      const quality = assessBeatPlanConcreteness(beatPlan, ctx.characters)
      if (!quality.ok) {
        beatPlan = await deps.planBeat(
          ctx,
          canon,
          formatPlanQualityFeedback(quality.failures),
          sparksBlock
        )
        const retriedQuality = assessBeatPlanConcreteness(beatPlan, ctx.characters)
        if (!retriedQuality.ok) {
          planWarnings = retriedQuality.failures
        }
      }

      return {
        ...inputData,
        canon,
        beatPlan,
        planWarnings,
        sparks: keptSparks.map(entry => entry.idea.hook),
      }
    },
  })

  const draftStep = createStep({
    id: BeatDraftStepId.DraftScript,
    inputSchema: planOutputSchema,
    outputSchema: draftOutputSchema,
    scorers: CRAFT_STEP_SCORERS,
    execute: async ({ inputData }) => {
      const draft = await deps.draftBeat(
        {
          projectId: inputData.projectId,
          episodeId: inputData.episodeId,
          brief: inputData.brief,
          characters: inputData.characters,
        },
        inputData.canon,
        inputData.beatPlan
      )
      return { ...inputData, draft }
    },
  })

  const critiqueStep = createStep({
    id: BeatDraftStepId.Critique,
    inputSchema: draftOutputSchema,
    outputSchema: critiqueOutputSchema,
    execute: async ({ inputData }) => {
      const critiques = await deps.critique(inputData.draft, inputData.canon)
      return { ...inputData, critiques }
    },
  })

  const verdictStep = createStep({
    id: VERDICT_STEP_ID,
    inputSchema: critiqueOutputSchema,
    suspendSchema: z.object({
      reason: z.string(),
      beatPlan: BeatPlanSchema,
      draft: z.string(),
      critiques: z.string(),
      planWarnings: z.array(z.string()).optional(),
      /** Kept Muse spark hooks — the human sees what provoked the plan (5.3). */
      sparks: z.array(z.string()).optional(),
    }),
    resumeSchema: z.object({
      action: z.enum([
    BeatDraftVerdictAction.Approve,
    BeatDraftVerdictAction.Revise,
    BeatDraftVerdictAction.Kill,
  ]),
      note: z.string().optional().describe(BEAT_DRAFT_VERDICT_NOTE_DESC),
    }),
    outputSchema: verdictOutputSchema,
    execute: async ({ inputData, resumeData, suspend }) => {
      if (!resumeData) {
        if (inputData.autoApprove) {
          return { ...inputData, action: BeatDraftVerdictAction.Approve, note: undefined }
        }
        return await suspend({
          reason: BEAT_DRAFT_VERDICT_SUSPEND_REASON,
          beatPlan: inputData.beatPlan,
          draft: inputData.draft,
          critiques: inputData.critiques,
          ...(inputData.planWarnings.length > 0 ? { planWarnings: inputData.planWarnings } : {}),
          ...(inputData.sparks.length > 0 ? { sparks: inputData.sparks } : {}),
        })
      }
      return { ...inputData, action: resumeData.action, note: resumeData.note }
    },
  })

  const reviseStep = createStep({
    id: BeatDraftStepId.Revise,
    inputSchema: verdictOutputSchema,
    outputSchema: beatDraftOutputSchema,
    scorers: CRAFT_STEP_SCORERS,
    execute: async ({ inputData }) => {
      if (inputData.action === BeatDraftVerdictAction.Kill) {
        return {
          finalDraft: '',
          critiques: inputData.critiques,
          beatPlan: inputData.beatPlan,
          saved: false,
          killed: true,
          message: BEAT_DRAFT_KILLED_MESSAGE,
        }
      }

      const ctx: BeatDraftContext = {
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
        brief: inputData.brief,
        characters: inputData.characters,
      }
      const finalDraft = await deps.reviseBeat(
        ctx,
        inputData.canon,
        inputData.draft,
        inputData.critiques,
        inputData.action === BeatDraftVerdictAction.Revise ? inputData.note : undefined
      )
      const persisted = await deps.persistBeat(ctx, inputData.beatPlan, finalDraft)

      return {
        finalDraft,
        critiques: inputData.critiques,
        beatPlan: inputData.beatPlan,
        beatId: persisted.beatId,
        saved: persisted.saved,
        killed: false,
        message: persisted.message,
      }
    },
  })

  return createWorkflow({
    id: BEAT_DRAFT_WORKFLOW_ID,
    description:
      'Plan a beat, draft it in script format, run three narrow critics in parallel, suspend for the editorial verdict (approve/revise/kill; skipped with autoApprove), then have the same author revise and persist the beat.',
    inputSchema: beatDraftInputSchema,
    outputSchema: beatDraftOutputSchema,
  })
    .then(planStep)
    .then(draftStep)
    .then(critiqueStep)
    .then(verdictStep)
    .then(reviseStep)
    .commit()
}

/** Production workflow instance — registered on the central Mastra instance. */
export const beatDraftWorkflow = createBeatDraftWorkflow()
