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

import { createStep, createWorkflow } from '@mastra/core/workflows'
import {
  isValidationError,
  noopObserve,
  type ToolExecutionContext,
  type ValidationError,
} from '@mastra/core/tools'
import type { Agent } from '@mastra/core/agent'
import { z } from 'zod'
import { BeatPlanSchema, type BeatPlan } from '@/domains/storyteller/agents/BeatPlanner/beat-plan-schema'
import {
  assessBeatPlanConcreteness,
  formatPlanQualityFeedback,
} from '@/domains/storyteller/agents/BeatPlanner/beat-plan-quality'
import { statelessGrrmAuthor, statelessBeatPlanner } from './stateless-agents'
import {
  continuityCritic,
  proseCritic,
  stakesCritic,
  CriticReportSchema,
  formatCriticReport,
} from '@/domains/storyteller/agents/critics'
import { manageBeatTool, listBeatsTool } from '@/domains/storyteller/agents/tools/beat-tools'
import { readWorldBibleTool } from '@/domains/storyteller/agents/tools/bible-tools'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
  beatDraftInputSchema,
  beatDraftOutputSchema,
} from './beat-draft-contract'
import { proseCraftScorer, stakesCostScorer } from '@/shared/agent-kernel/scorers'

/**
 * Craft scorers attached to the draft and revise steps (rate 1, StoryForge
 * pattern): scores land in Mastra storage / Studio Observability and answer
 * "did the revision beat the draft?" across prompt changes. Scoring is async
 * observability — a judge failure never fails the run.
 */
const CRAFT_STEP_SCORERS = {
  proseCraft: { scorer: proseCraftScorer, sampling: { type: 'ratio', rate: 1 } },
  stakesCost: { scorer: stakesCostScorer, sampling: { type: 'ratio', rate: 1 } },
} as const

export { beatDraftInputSchema, beatDraftOutputSchema, BEAT_DRAFT_WORKFLOW_ID, VERDICT_STEP_ID }

// ==========================================
// DEPENDENCY SURFACE (injectable for tests)
// ==========================================

export interface BeatDraftContext {
  projectId: string
  episodeId: string
  brief: string
  characters: string[]
}

export interface PersistedBeat {
  saved: boolean
  beatId?: string
  message: string
}

export interface BeatDraftDeps {
  /** Canon + previous-beat context assembled for author/critics. */
  assembleCanon: (ctx: BeatDraftContext) => Promise<string>
  /**
   * Structured beat plan — never prose. `retryFeedback` is set on the single
   * concreteness-gate retry and names exactly what failed.
   */
  planBeat: (ctx: BeatDraftContext, canon: string, retryFeedback?: string) => Promise<BeatPlan>
  /** Script-format draft from the plan. */
  draftBeat: (ctx: BeatDraftContext, canon: string, plan: BeatPlan) => Promise<string>
  /** Three narrow critics; returns the formatted critique block. */
  critique: (draft: string, canon: string) => Promise<string>
  /** Same author revises against critiques (+ optional editor note). */
  reviseBeat: (
    ctx: BeatDraftContext,
    canon: string,
    draft: string,
    critiques: string,
    editorNote?: string
  ) => Promise<string>
  /** Persist the final beat via the canonical CRUD tool. */
  persistBeat: (ctx: BeatDraftContext, plan: BeatPlan, finalDraft: string) => Promise<PersistedBeat>
}

// ==========================================
// DEFAULT (PRODUCTION) DEPENDENCIES
// ==========================================

/**
 * Invoke a canonical CRUD tool directly from a workflow step (v1 signature:
 * `execute(inputData, context)`), unwrapping the optional-execute and
 * validation-error cases.
 */
async function invokeTool<TInput, TOutput>(
  tool: {
    id: string
    execute?: (
      inputData: TInput,
      context: ToolExecutionContext
    ) => Promise<TOutput | ValidationError | undefined>
  },
  input: TInput
): Promise<TOutput> {
  if (!tool.execute) {
    throw new Error(`Tool ${tool.id} has no execute function`)
  }
  const result = await tool.execute(input, { observe: noopObserve })
  if (result === undefined || result === null) {
    throw new Error(`Tool ${tool.id} returned no result`)
  }
  if (isValidationError(result)) {
    throw new Error(`Tool ${tool.id} input validation failed: ${JSON.stringify(result)}`)
  }
  return result
}

async function runCritic(critic: Agent, name: string, prompt: string): Promise<string> {
  const response = await critic.generate(prompt, {
    structuredOutput: { schema: CriticReportSchema },
  })
  const parsed = CriticReportSchema.safeParse(response.object)
  if (!parsed.success) {
    // Critic failed the schema — degrade to its raw text rather than losing the run.
    return `## ${name} findings\n${response.text || 'NO FINDINGS.'}`
  }
  return formatCriticReport(name, parsed.data)
}

export const defaultBeatDraftDeps: BeatDraftDeps = {
  assembleCanon: async ctx => {
    const bible = await invokeTool(readWorldBibleTool, { projectId: ctx.projectId })
    const beats = await invokeTool(listBeatsTool, {
      episodeId: ctx.episodeId,
      includeContent: false,
    })
    return `WORLD BIBLE (canon — do not contradict):\n${JSON.stringify(bible, null, 2)}\n\nEXISTING BEATS:\n${JSON.stringify(beats, null, 2)}`
  },

  planBeat: async (ctx, canon, retryFeedback) => {
    const retryBlock = retryFeedback
      ? `

YOUR PREVIOUS PLAN FAILED THESE CONCRETENESS CHECKS — fix exactly these, keep what worked:
${retryFeedback}`
      : ''
    const prompt = `${canon}

Plan the next beat for episode ${ctx.episodeId}.

Brief (what this beat must accomplish):
${ctx.brief}

${ctx.characters.length > 0 ? `Characters available: ${ctx.characters.join(', ')}` : ''}

Output a beat plan with: goal, conflict, turn, dialogueHook, charactersInvolved.${retryBlock}`

    const response = await statelessBeatPlanner.generate(prompt, {
      structuredOutput: { schema: BeatPlanSchema },
    })
    const plan = BeatPlanSchema.safeParse(response.object)
    if (!plan.success) {
      throw new Error(`Beat planner returned an invalid plan: ${plan.error.message}`)
    }
    return plan.data
  },

  draftBeat: async (ctx, canon, plan) => {
    // toolChoice 'none': the step assembled all context — drafting is pure
    // writing, no tool detours (StoryForge pattern).
    const prompt = `${canon}

Generate a script-format story beat for episode ${ctx.episodeId}.
Beat plan: ${JSON.stringify(plan)}
Characters involved: ${plan.charactersInvolved.join(', ')}

Follow the Script Beat Format (§ GrrmSystemPrompt):
- Slugline (INT/EXT location)
- Action lines (max 2 per beat)
- Dialogue blocks with subtext notes
- Ensure Law of Motion fields: actionTaken, consequence, storyStateChange

Output ONLY the script beat — no preamble, no notes.`

    const response = await statelessGrrmAuthor.generate(prompt, { toolChoice: 'none' })
    return response.text
  },

  critique: async (draft, canon) => {
    const canonBlock = `CANON:\n${canon}`
    const draftBlock = `DRAFT BEAT:\n${draft}`
    const [continuity, prose, stakes] = await Promise.all([
      runCritic(continuityCritic, 'Continuity', `${canonBlock}\n\n${draftBlock}`),
      runCritic(proseCritic, 'Prose', draftBlock),
      runCritic(stakesCritic, 'Stakes', `${canonBlock}\n\n${draftBlock}`),
    ])
    return [continuity, prose, stakes].join('\n\n')
  },

  reviseBeat: async (ctx, canon, draft, critiques, editorNote) => {
    const noteBlock = editorNote
      ? `\nYOUR EDITOR'S DIRECTION (this outranks the critics and your own preferences):\n${editorNote}\n`
      : ''
    const prompt = `${canon}

You drafted this script beat:

${draft}

Three narrow critics reviewed it. Their briefs are deliberately limited; they diagnose, you decide. You may REJECT findings that would damage the beat's voice or intent — critics find faults, they don't hold the vision. Fix what is genuinely broken.

${critiques}
${noteBlock}
Output the REVISED beat in full, in Script Beat Format. Script only — no preamble, no notes.`

    const response = await statelessGrrmAuthor.generate(prompt, { toolChoice: 'none' })
    return response.text
  },

  persistBeat: async (ctx, plan, finalDraft) => {
    // Law of Motion fields are derived from the beat plan: the goal pursued is
    // the action, the turn is what changed. Refined by the plan-quality item
    // (PLAN.md item 35) in a later wave.
    const result = await invokeTool(manageBeatTool, {
      operation: 'create' as const,
      episodeId: ctx.episodeId,
      projectId: ctx.projectId,
      data: {
        logline: plan.goal,
        content: finalDraft,
        charactersInvolved: plan.charactersInvolved,
        actionTaken: plan.goal,
        consequence: plan.conflict,
        storyStateChange: plan.turn,
      },
    })
    return {
      saved: result.success,
      beatId: result.beat?.id,
      message: result.message ?? result.error ?? 'manage_beat completed',
    }
  },
}

// ==========================================
// SCHEMAS (boundary schemas live in beat-draft-contract.ts)
// ==========================================

const planOutputSchema = beatDraftInputSchema.extend({
  canon: z.string(),
  beatPlan: BeatPlanSchema,
  /** Concreteness-gate failures that survived the single retry (usually empty). */
  planWarnings: z.array(z.string()),
})

const draftOutputSchema = planOutputSchema.extend({
  draft: z.string(),
})

const critiqueOutputSchema = draftOutputSchema.extend({
  critiques: z.string(),
})

const verdictOutputSchema = critiqueOutputSchema.extend({
  action: z.enum(['approve', 'revise', 'kill']),
  note: z.string().optional(),
})

// ==========================================
// WORKFLOW FACTORY
// ==========================================

export function createBeatDraftWorkflow(deps: BeatDraftDeps = defaultBeatDraftDeps) {
  const planStep = createStep({
    id: 'plan-beat',
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
      let beatPlan = await deps.planBeat(ctx, canon)
      let planWarnings: string[] = []

      // Concreteness gate: retry ONCE with the failures named; a second
      // failure passes through flagged rather than erroring the run.
      const quality = assessBeatPlanConcreteness(beatPlan, ctx.characters)
      if (!quality.ok) {
        beatPlan = await deps.planBeat(ctx, canon, formatPlanQualityFeedback(quality.failures))
        const retriedQuality = assessBeatPlanConcreteness(beatPlan, ctx.characters)
        if (!retriedQuality.ok) {
          planWarnings = retriedQuality.failures
        }
      }

      return { ...inputData, canon, beatPlan, planWarnings }
    },
  })

  const draftStep = createStep({
    id: 'draft-script',
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
    id: 'critique',
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
    }),
    resumeSchema: z.object({
      action: z.enum(['approve', 'revise', 'kill']),
      note: z.string().optional().describe('Editorial direction, used when action is revise'),
    }),
    outputSchema: verdictOutputSchema,
    execute: async ({ inputData, resumeData, suspend }) => {
      if (!resumeData) {
        if (inputData.autoApprove) {
          return { ...inputData, action: 'approve' as const, note: undefined }
        }
        return await suspend({
          reason:
            'Editorial verdict required: approve (revise against critiques), revise (add your note), or kill (discard draft).',
          beatPlan: inputData.beatPlan,
          draft: inputData.draft,
          critiques: inputData.critiques,
          ...(inputData.planWarnings.length > 0 ? { planWarnings: inputData.planWarnings } : {}),
        })
      }
      return { ...inputData, action: resumeData.action, note: resumeData.note }
    },
  })

  const reviseStep = createStep({
    id: 'revise',
    inputSchema: verdictOutputSchema,
    outputSchema: beatDraftOutputSchema,
    scorers: CRAFT_STEP_SCORERS,
    execute: async ({ inputData }) => {
      if (inputData.action === 'kill') {
        return {
          finalDraft: '',
          critiques: inputData.critiques,
          beatPlan: inputData.beatPlan,
          saved: false,
          killed: true,
          message: 'Draft killed by editor — nothing saved.',
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
        inputData.action === 'revise' ? inputData.note : undefined
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
