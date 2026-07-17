import {
  isValidationError,
  noopObserve,
  type ToolExecutionContext,
  type ValidationError,
} from '@mastra/core/tools'
import type { Agent } from '@mastra/core/agent'
import { BeatPlanSchema } from '@/domains/storyteller/ai/agents/BeatPlanner/beat-plan-schema'
import { brainstormWildIdeas } from '@/domains/storyteller/ai/agents/Muse/brainstorm'
import { rankWildIdeas } from '@/domains/storyteller/ai/agents/Muse/rank'
import {
  continuityCritic,
  proseCritic,
  stakesCritic,
  CriticReportSchema,
  formatCriticReport,
} from '@/domains/storyteller/ai/agents/critics'
import { manageBeatTool, listBeatsTool } from '@/domains/storyteller/ai/tools/beat-tools'
import { readWorldBibleTool } from '@/domains/storyteller/ai/tools/bible-tools'
import { statelessGrrmAuthor, statelessBeatPlanner } from './stateless-agents'
import {
  BEAT_DRAFT_CHARACTERS_JOIN,
  BEAT_DRAFT_CRITIQUE_JOIN,
  BEAT_DRAFT_MANAGE_BEAT_COMPLETED,
  BEAT_DRAFT_NO_FINDINGS,
  BeatDraftCriticName,
  BeatDraftManageBeatOperation,
  BeatDraftToolChoice,
} from './constants/beat-draft-workflow'
import type { BeatDraftDeps } from './beat-draft-deps-types'

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
    return `## ${name} findings\n${response.text || BEAT_DRAFT_NO_FINDINGS}`
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

  planBeat: async (ctx, canon, retryFeedback, sparksBlock) => {
    const retryBlock = retryFeedback
      ? `

YOUR PREVIOUS PLAN FAILED THESE CONCRETENESS CHECKS — fix exactly these, keep what worked:
${retryFeedback}`
      : ''
    const prompt = `${canon}

Plan the next beat for episode ${ctx.episodeId}.

Brief (what this beat must accomplish):
${ctx.brief}

${ctx.characters.length > 0 ? `Characters available: ${ctx.characters.join(BEAT_DRAFT_CHARACTERS_JOIN)}` : ''}
${sparksBlock ?? ''}
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
    const prompt = `${canon}

Generate a script-format story beat for episode ${ctx.episodeId}.
Beat plan: ${JSON.stringify(plan)}
Characters involved: ${plan.charactersInvolved.join(BEAT_DRAFT_CHARACTERS_JOIN)}

Follow the Script Beat Format (§ GrrmSystemPrompt):
- Slugline (INT/EXT location)
- Action lines (max 2 per beat)
- Dialogue blocks with subtext notes
- Ensure Law of Motion fields: actionTaken, consequence, storyStateChange

Output ONLY the script beat — no preamble, no notes.`

    const response = await statelessGrrmAuthor.generate(prompt, { toolChoice: BeatDraftToolChoice.None })
    return response.text
  },

  critique: async (draft, canon) => {
    const canonBlock = `CANON:\n${canon}`
    const draftBlock = `DRAFT BEAT:\n${draft}`
    const [continuity, prose, stakes] = await Promise.all([
      runCritic(continuityCritic, BeatDraftCriticName.Continuity, `${canonBlock}\n\n${draftBlock}`),
      runCritic(proseCritic, BeatDraftCriticName.Prose, draftBlock),
      runCritic(stakesCritic, BeatDraftCriticName.Stakes, `${canonBlock}\n\n${draftBlock}`),
    ])
    return [continuity, prose, stakes].join(BEAT_DRAFT_CRITIQUE_JOIN)
  },

  reviseBeat: async (_ctx, canon, draft, critiques, editorNote) => {
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

    const response = await statelessGrrmAuthor.generate(prompt, { toolChoice: BeatDraftToolChoice.None })
    return response.text
  },

  generateSparks: async (ctx, canon) => {
    const { ideas } = await brainstormWildIdeas({
      premiseFragment: ctx.brief,
      characters: ctx.characters,
      seedText: `${ctx.episodeId}:${ctx.brief}`,
    })
    const { kept } = await rankWildIdeas({ ideas, canon, brief: ctx.brief })
    return kept
  },

  persistBeat: async (ctx, plan, finalDraft) => {
    const result = await invokeTool(manageBeatTool, {
      operation: BeatDraftManageBeatOperation.Create,
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
      message: result.message ?? result.error ?? BEAT_DRAFT_MANAGE_BEAT_COMPLETED,
    }
  },
}
