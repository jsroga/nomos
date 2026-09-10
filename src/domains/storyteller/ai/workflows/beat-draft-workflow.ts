/**
 * beat-draft-workflow — the GRRM quality pipeline (StoryForge port).
 *
 *   plan-beat (BeatPlanner, structured JSON)
 *     → draft-script (GrrmAuthor, script-beat format, toolChoice none)
 *     → prose-check (deterministic lint; one author redraft; remaining errors skip critics)
 *     → critic loop (`.dountil`, max 3 writer revises; first clean pass does not rewrite)
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
 */

import '@/shared/data/server-guard'
import { createStep, createWorkflow } from '@mastra/core/workflows'
import { z } from 'zod'
import { BeatPlanSchema } from '../agents/BeatPlanner/beat-plan-schema'
import {
  assessBeatPlanConcreteness,
  formatPlanQualityFeedback,
} from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-quality'
import { formatSparksForPlanner } from '@/domains/storyteller/ai/agents/Muse/rank'
import { CanonAudience, formatCanonFor } from './beat-draft-canon'
import { runLintRedraftLoop } from './beat-draft-lint-loop'
import { formatParagraphDiff } from './beat-draft-paragraph-diff'
import { defaultBeatDraftDeps } from './beat-draft-default-deps'
import type { BeatDraftContext, BeatDraftDeps } from './beat-draft-deps-types'
import { authorCanonText } from './beat-draft-author-canon'
import {
  createBeatDraftCriticLoop,
  isCriticLoopDone,
} from './beat-draft-critic-loop'
import {
  beatDraftCriticLoopOutputSchema,
  beatDraftDraftOutputSchema,
  beatDraftPlanOutputSchema,
  beatDraftProseCheckOutputSchema,
  beatDraftVerdictOutputSchema,
} from './beat-draft-step-schemas'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
  beatDraftInputSchema,
  beatDraftOutputSchema,
} from './beat-draft-contract'
import { emitRunTrace, RunTraceEventType } from '../../../../shared/agent-kernel/run-trace'
import {
  BEAT_DRAFT_CRITIC_ROLES,
  BEAT_DRAFT_CLAIM_CHECK_FAIL_MESSAGE,
  BEAT_DRAFT_KILLED_MESSAGE,
  BEAT_DRAFT_VERDICT_NOTE_DESC,
  BEAT_DRAFT_VERDICT_SUSPEND_REASON,
  BeatDraftStepDescription,
  BeatDraftStepId,
  BeatDraftStyleFidelity,
  BeatDraftVerdictAction,
  BeatDraftWorkflowCopy,
} from './constants/beat-draft-workflow'

export {
  beatDraftInputSchema,
  beatDraftOutputSchema,
  BEAT_DRAFT_CRITIC_ROLES,
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
}
export type { BeatDraftContext, BeatDraftDeps, PersistedBeat } from './beat-draft-deps-types'
export { defaultBeatDraftDeps } from './beat-draft-default-deps'

export function createBeatDraftWorkflow(deps: BeatDraftDeps = defaultBeatDraftDeps) {
  const criticLoop = createBeatDraftCriticLoop(deps)

  const planStep = createStep({
    id: BeatDraftStepId.PlanBeat,
    description: BeatDraftStepDescription.PlanBeat,
    inputSchema: beatDraftInputSchema,
    outputSchema: beatDraftPlanOutputSchema,
    execute: async ({ inputData }) => {
      emitRunTrace({
        type: RunTraceEventType.RoleDispatch,
        stepId: BeatDraftStepId.PlanBeat,
        role: BeatDraftStepId.PlanBeat,
      })
      const ctx: BeatDraftContext = {
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
        brief: inputData.brief,
        characters: inputData.characters,
      }
      const assembled = await deps.assembleCanon(ctx)
      const plannerCanon = formatCanonFor(CanonAudience.Planner, assembled, ctx.characters)

      // Muse sparks (5.3): opt-in, never fatal — an empty result proceeds
      // sparkless. The planner must engage-or-reject each spark by number.
      const keptSparks = inputData.wildcards ? await deps.generateSparks(ctx, plannerCanon) : []
      const sparksBlock = keptSparks.length > 0 ? formatSparksForPlanner(keptSparks) : undefined

      let beatPlan = await deps.planBeat(ctx, plannerCanon, undefined, sparksBlock)
      let planWarnings: string[] = []

      // Concreteness gate: retry ONCE with the failures named; a second
      // failure passes through flagged rather than erroring the run.
      const quality = assessBeatPlanConcreteness(beatPlan, ctx.characters)
      if (!quality.ok) {
        beatPlan = await deps.planBeat(
          ctx,
          plannerCanon,
          formatPlanQualityFeedback(quality.failures),
          sparksBlock
        )
        const retriedQuality = assessBeatPlanConcreteness(beatPlan, ctx.characters)
        if (!retriedQuality.ok) {
          planWarnings = retriedQuality.failures
        }
      }

      emitRunTrace({
        type: RunTraceEventType.RoleResult,
        stepId: BeatDraftStepId.PlanBeat,
        role: BeatDraftStepId.PlanBeat,
      })
      return {
        ...inputData,
        canon: assembled,
        beatPlan,
        planWarnings,
        sparks: keptSparks.map(entry => entry.idea.hook),
      }
    },
  })

  const draftStep = createStep({
    id: BeatDraftStepId.DraftScript,
    description: BeatDraftStepDescription.DraftScript,
    inputSchema: beatDraftPlanOutputSchema,
    outputSchema: beatDraftDraftOutputSchema,
    execute: async ({ inputData }) => {
      emitRunTrace({
        type: RunTraceEventType.RoleDispatch,
        stepId: BeatDraftStepId.DraftScript,
        role: BeatDraftStepId.DraftScript,
      })
      const ctx: BeatDraftContext = {
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
        brief: inputData.brief,
        characters: inputData.characters,
      }
      const draft = await deps.draftBeat(
        ctx,
        authorCanonText(inputData.canon, inputData.characters),
        inputData.beatPlan
      )
      emitRunTrace({
        type: RunTraceEventType.RoleResult,
        stepId: BeatDraftStepId.DraftScript,
        role: BeatDraftStepId.DraftScript,
      })
      return { ...inputData, draft }
    },
  })

  const proseCheckStep = createStep({
    id: BeatDraftStepId.ProseCheck,
    description: BeatDraftStepDescription.ProseCheck,
    inputSchema: beatDraftDraftOutputSchema,
    outputSchema: beatDraftProseCheckOutputSchema,
    execute: async ({ inputData }) => {
      const ctx: BeatDraftContext = {
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
        brief: inputData.brief,
        characters: inputData.characters,
      }
      const linted = await runLintRedraftLoop({
        draft: inputData.draft,
        plan: inputData.beatPlan,
        ctx,
        canon: inputData.canon,
        authorCanon: authorCanonText(inputData.canon, inputData.characters),
        runProseCheck: deps.runProseCheck,
        draftBeat: deps.draftBeat,
      })
      return { ...inputData, ...linted }
    },
  })

  const verdictStep = createStep({
    id: VERDICT_STEP_ID,
    description: BeatDraftStepDescription.Verdict,
    inputSchema: beatDraftCriticLoopOutputSchema,
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
    outputSchema: beatDraftVerdictOutputSchema,
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
    description: BeatDraftStepDescription.Revise,
    inputSchema: beatDraftVerdictOutputSchema,
    outputSchema: beatDraftOutputSchema,
    execute: async ({ inputData }) => {
      if (inputData.action === BeatDraftVerdictAction.Kill) {
        emitRunTrace({
          type: RunTraceEventType.GateDecision,
          stepId: BeatDraftStepId.Revise,
          detail: BeatDraftVerdictAction.Kill,
        })
        return {
          finalDraft: '',
          critiques: inputData.critiques,
          beatPlan: inputData.beatPlan,
          saved: false,
          killed: true,
          message: BEAT_DRAFT_KILLED_MESSAGE,
        }
      }

      emitRunTrace({
        type: RunTraceEventType.GateDecision,
        stepId: BeatDraftStepId.Revise,
        detail: inputData.action,
      })

      const ctx: BeatDraftContext = {
        projectId: inputData.projectId,
        episodeId: inputData.episodeId,
        brief: inputData.brief,
        characters: inputData.characters,
      }
      const revised = await deps.reviseBeat(
        ctx,
        authorCanonText(inputData.canon, inputData.characters),
        inputData.draft,
        inputData.critiques,
        inputData.action === BeatDraftVerdictAction.Revise ? inputData.note : undefined
      )
      const styleDiff = formatParagraphDiff(inputData.draft, revised)
      emitRunTrace({
        type: RunTraceEventType.RoleDispatch,
        stepId: BeatDraftStepId.Revise,
        role: BeatDraftStyleFidelity.Detail,
        detail: BeatDraftStyleFidelity.Detail,
      })
      await deps.reviewStyleFidelity(styleDiff)
      emitRunTrace({
        type: RunTraceEventType.RoleResult,
        stepId: BeatDraftStepId.Revise,
        role: BeatDraftStyleFidelity.Detail,
        detail: BeatDraftStyleFidelity.Detail,
      })
      const finalDraft = await deps.humanizeBeat(ctx, revised)
      const claim = deps.claimCheckBeat(revised, finalDraft)
      if (!claim.ok) {
        emitRunTrace({
          type: RunTraceEventType.ClaimCheckFail,
          stepId: BeatDraftStepId.Revise,
          detail: `missing=${claim.missing.length};altered=${claim.altered.length}`,
        })
        return {
          finalDraft,
          critiques: inputData.critiques,
          beatPlan: inputData.beatPlan,
          saved: false,
          killed: false,
          message: BEAT_DRAFT_CLAIM_CHECK_FAIL_MESSAGE,
        }
      }
      const persisted = await deps.persistBeat(ctx, inputData.beatPlan, finalDraft)
      emitRunTrace({
        type: RunTraceEventType.PersistCommit,
        stepId: BeatDraftStepId.Revise,
      })

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
    description: BeatDraftWorkflowCopy.Description,
    inputSchema: beatDraftInputSchema,
    outputSchema: beatDraftOutputSchema,
  })
    .then(planStep)
    .then(draftStep)
    .then(proseCheckStep)
    .dountil(criticLoop, async ({ inputData }) => isCriticLoopDone(inputData))
    .then(verdictStep)
    .then(reviseStep)
    .commit()
}

/** Production workflow instance — registered on the central Mastra instance. */
export const beatDraftWorkflow = createBeatDraftWorkflow()
