import '@/shared/data/server-guard'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { meteredCall } from '@/shared/ai/gateway/agent'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import {
  fileAgentsRootDir,
  stripMarkdownFrontmatter,
} from '@/shared/agent-kernel/mastra/load-agent-instructions'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { GrrmAuthorAgentId } from '@/domains/storyteller/ai/constants/agent-identity'
import { listBeatsTool } from '@/domains/storyteller/ai/tools/beat-tools'
import { BeatStatus } from '@/domains/storyteller/core/types/enums'
import { packMasterPromptVoice } from '@/domains/storyteller/services/pack-master-prompt-voice'
import { loadProjectMasterPrompt } from '@/domains/storyteller/core/io/beat-sequence'
import {
  isValidationError,
  noopObserve,
  type ToolExecutionContext,
  type ValidationError,
} from '@mastra/core/tools'
import { statelessGrrmAuthor } from './stateless-agents'
import {
  BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS,
  BEAT_DRAFT_CRITIQUE_JOIN,
  BeatDraftHumanizerCopy,
  BeatDraftHumanizerFs,
  BeatDraftHumanizerSample,
  BeatDraftToolChoice,
} from './constants/beat-draft-workflow'
import type { BeatDraftContext } from './beat-draft-deps-types'

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

function loadHumanizerSkillBody(): string {
  return stripMarkdownFrontmatter(
    readFileSync(
      join(
        fileAgentsRootDir(),
        GrrmAuthorAgentId.GrrmAuthor,
        BeatDraftHumanizerFs.SkillsDir,
        BeatDraftHumanizerFs.SkillId,
        BeatDraftHumanizerFs.SkillFile
      ),
      FileEncoding.Utf8
    )
  )
}

async function loadAcceptedBeatSample(episodeId: string): Promise<string> {
  const listed = await invokeTool(listBeatsTool, {
    episodeId,
    includeContent: true,
  })
  const accepted = (listed?.beats ?? [])
    .filter(
      beat =>
        beat.status === BeatStatus.APPROVED || beat.status === BeatStatus.LOCKED
    )
    .slice(0, BeatDraftHumanizerSample.MaxBeats)
    .map(beat => beat.content ?? '')
    .filter(content => content.length > 0)
  if (accepted.length === 0) return BeatDraftHumanizerCopy.NoAcceptedBeats
  return accepted.join(BEAT_DRAFT_CRITIQUE_JOIN)
}

function extractAuthorScript(text: string): string {
  const withoutThinking = text
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .replace(/^```(?:script|text|markdown)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return withoutThinking.length > 0 ? withoutThinking : text.trim()
}

/** Stateless Author generate with Humanizer skill only; meter StorytellerBeatHumanize. */
export async function humanizeBeatDraft(
  ctx: BeatDraftContext,
  draft: string
): Promise<string> {
  const packed = packMasterPromptVoice(await loadProjectMasterPrompt(ctx.projectId))
  const voice = packed.length > 0 ? `${packed}${BEAT_DRAFT_CRITIQUE_JOIN}` : ''
  const sample = await loadAcceptedBeatSample(ctx.episodeId)
  const prompt = [
    loadHumanizerSkillBody(),
    `${voice}${BeatDraftHumanizerCopy.SampleHeader}`,
    sample,
    BeatDraftHumanizerCopy.SourceHeader,
    draft,
    BeatDraftHumanizerCopy.Instruction,
  ].join(BEAT_DRAFT_CRITIQUE_JOIN)

  const response = await meteredCall(LlmFeature.StorytellerBeatHumanize, () =>
    Promise.race([
      statelessGrrmAuthor.generate(prompt, {
        toolChoice: BeatDraftToolChoice.None,
        maxSteps: 1,
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(
            new Error(
              `Humanizer generate timed out after ${BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS}ms`
            )
          )
        }, BEAT_DRAFT_AUTHOR_GENERATE_TIMEOUT_MS)
      }),
    ])
  )
  return extractAuthorScript(response.text)
}
