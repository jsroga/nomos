import { meteredCall } from '@/shared/ai/gateway/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
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
import { listEpisodesTool } from '@/domains/storyteller/ai/tools/episode-tools'
import {
  formatRoadmapSlotBrief,
  resolveRoadmapSlot,
} from '@/domains/storyteller/core/utils/roadmap-slot'
import { statelessGrrmAuthor, statelessBeatPlanner } from './stateless-agents'
import {
  BEAT_DRAFT_AUTHOR_CANON_CHAR_BUDGET,
  BEAT_DRAFT_AUTHOR_CANON_TRUNCATED,
  BEAT_DRAFT_AUTHOR_CRITIQUES_CHAR_BUDGET,
  BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS,
  BEAT_DRAFT_CHARACTERS_JOIN,
  BEAT_DRAFT_MANAGE_BEAT_COMPLETED,
  BEAT_DRAFT_NO_FINDINGS,
  BeatDraftCanonHeading,
  BeatDraftCriticName,
  BeatDraftStructuredOutputErrorStrategy,
  BeatDraftToolChoice,
  BeatDraftWorldBibleSection,
} from './constants/beat-draft-workflow'
import { ManageToolOperation } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { ManageBeatOutputSchema } from '@/domains/storyteller/ai/tools/beat-tools-schema'
import { nextBeatSequence } from '@/domains/storyteller/core/io/beat-sequence'
import type { BeatDraftDeps } from './beat-draft-deps-types'

function truncateForAuthor(text: string, budget: number): string {
  if (text.length <= budget) return text
  return `${text.slice(0, budget)}${BEAT_DRAFT_AUTHOR_CANON_TRUNCATED}`
}

function truncateCanonForAuthor(canon: string): string {
  return truncateForAuthor(canon, BEAT_DRAFT_AUTHOR_CANON_CHAR_BUDGET)
}

/** Thinking models may wrap chain-of-thought; strip it so only script text is persisted. */
function extractAuthorScript(text: string): string {
  const withoutThinking = text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/^```(?:script|text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return withoutThinking.length > 0 ? withoutThinking : text.trim()
}

async function generateAuthorDraft(prompt: string): Promise<string> {
  const hardened = `${prompt}

Respond with the script beat only. No thinking tags, no markdown fences, no preamble.`

  let lastText = ''
  for (let attempt = 0; attempt < 1; attempt++) {
    const response = await Promise.race([
      statelessGrrmAuthor.generate(hardened, {
        toolChoice: BeatDraftToolChoice.None,
        maxSteps: 1,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Author generate timed out after ${BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS}ms (attempt ${attempt + 1})`
            )
          )
        }, BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS)
      }),
    ])
    lastText = response.text
    const script = extractAuthorScript(lastText)
    if (script.length > 0) return script
  }

  throw new Error(
    `Author generate returned empty script text after retry (raw length ${lastText.length})`
  )
}

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
  try {
    const response = await meteredCall(LlmFeature.StorytellerBeatPlan, () => critic.generate(prompt, {
      structuredOutput: {
        schema: CriticReportSchema,
        errorStrategy: BeatDraftStructuredOutputErrorStrategy.Warn,
      },
    }))
    const parsed = CriticReportSchema.safeParse(response.object)
    if (!parsed.success) {
      return `## ${name} findings\n${response.text || BEAT_DRAFT_NO_FINDINGS}`
    }
    return formatCriticReport(name, parsed.data)
  } catch {
    return `## ${name} findings\n${BEAT_DRAFT_NO_FINDINGS}`
  }
}

export const defaultBeatDraftDeps: BeatDraftDeps = {
  assembleCanon: async ctx => {
    const bible = await invokeTool(readWorldBibleTool, {
      projectId: ctx.projectId,
      sections: [BeatDraftWorldBibleSection.All],
    })
    const beats = await invokeTool(listBeatsTool, {
      episodeId: ctx.episodeId,
      includeContent: false,
    })
    const listed = await invokeTool(listEpisodesTool, { projectId: ctx.projectId })
    const listedValue = listed ?? undefined
    const bibleValue = bible ?? undefined
    const current = listedValue?.episodes.find(episode => episode.id === ctx.episodeId)
    const slot =
      current === undefined
        ? undefined
        : resolveRoadmapSlot({ episodeRoadmap: bibleValue?.episodeRoadmap }, current.sequence)
    const slotBlock =
      current === undefined
        ? ''
        : `\n\n${BeatDraftCanonHeading.RoadmapSlot}\n${formatRoadmapSlotBrief(slot, current.sequence)}`
    return `WORLD BIBLE (canon — do not contradict):\n${JSON.stringify(bible, null, 2)}\n\nEXISTING BEATS:\n${JSON.stringify(beats, null, 2)}${slotBlock}`
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

    const response = await meteredCall(LlmFeature.StorytellerBeatPlan, () => statelessBeatPlanner.generate(prompt, {
      structuredOutput: { schema: BeatPlanSchema },
    }))
    const plan = BeatPlanSchema.safeParse(response.object)
    if (!plan.success) {
      throw new Error(`Beat planner returned an invalid plan: ${plan.error.message}`)
    }
    return plan.data
  },

  draftBeat: async (ctx, canon, plan) => {
    const prompt = `${truncateCanonForAuthor(canon)}

Generate a script-format story beat for episode ${ctx.episodeId}.
Beat plan: ${JSON.stringify(plan)}
Characters involved: ${plan.charactersInvolved.join(BEAT_DRAFT_CHARACTERS_JOIN)}

Follow the Script Beat Format (§ GrrmSystemPrompt):
- Slugline (INT/EXT location)
- Action lines (max 2 per beat)
- Dialogue blocks with subtext notes
- Ensure Law of Motion fields: actionTaken, consequence, storyStateChange

Output ONLY the script beat — no preamble, no notes.`

    return generateAuthorDraft(prompt)
  },

  critiqueContinuity: async (draft, canon) => {
    const canonBlock = `CANON:\n${canon}`
    const draftBlock = `DRAFT BEAT:\n${draft}`
    return runCritic(continuityCritic, BeatDraftCriticName.Continuity, `${canonBlock}\n\n${draftBlock}`)
  },

  critiqueProse: async (draft, _canon) => {
    const draftBlock = `DRAFT BEAT:\n${draft}`
    return runCritic(proseCritic, BeatDraftCriticName.Prose, draftBlock)
  },

  critiqueStakes: async (draft, canon) => {
    const canonBlock = `CANON:\n${canon}`
    const draftBlock = `DRAFT BEAT:\n${draft}`
    return runCritic(stakesCritic, BeatDraftCriticName.Stakes, `${canonBlock}\n\n${draftBlock}`)
  },

  reviseBeat: async (_ctx, canon, draft, critiques, editorNote) => {
    const noteBlock = editorNote
      ? `\nYOUR EDITOR'S DIRECTION (this outranks the critics and your own preferences):\n${editorNote}\n`
      : ''
    const prompt = `${truncateCanonForAuthor(canon)}

You drafted this script beat:

${draft}

Three narrow critics reviewed it. Their briefs are deliberately limited; they diagnose, you decide. You may REJECT findings that would damage the beat's voice or intent — critics find faults, they don't hold the vision. Fix what is genuinely broken.

${truncateForAuthor(critiques, BEAT_DRAFT_AUTHOR_CRITIQUES_CHAR_BUDGET)}
${noteBlock}
Output the REVISED beat in full, in Script Beat Format. Script only — no preamble, no notes.`

    return generateAuthorDraft(prompt)
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
    const sequence = await nextBeatSequence(ctx.episodeId)
    const result = await invokeTool(manageBeatTool, {
      operation: ManageToolOperation.Create,
      episodeId: ctx.episodeId,
      projectId: ctx.projectId,
      sequence,
      data: {
        logline: plan.goal,
        content: finalDraft,
        charactersInvolved: plan.charactersInvolved,
        actionTaken: plan.goal,
        consequence: plan.conflict,
        storyStateChange: plan.turn,
      },
    })
    const parsed = ManageBeatOutputSchema.safeParse(result)
    if (!parsed.success) {
      throw new Error(`Tool ${manageBeatTool.id} returned no result`)
    }
    if (parsed.data.success !== true) {
      throw new Error(parsed.data.error ?? parsed.data.message ?? BEAT_DRAFT_MANAGE_BEAT_COMPLETED)
    }
    return {
      saved: true,
      beatId: parsed.data.beat?.id,
      message: parsed.data.message ?? BEAT_DRAFT_MANAGE_BEAT_COMPLETED,
    }
  },
}
