import {
  SystemScopeReason,
  systemScope,
  type ProjectScope,
} from '@/shared/auth/project-scope'
import { createVisualSubjectClient } from '@/domains/storyteller/tasks/constants/visual-subject-client'
import { stringArrayFromJson } from '@/shared/data/json-guards'
import { firstMoodboardStyleRefUrl } from '@/domains/storyteller/core/moodboard-style-ref'
import {
  generateVisualSubjects,
  type GenerateVisualSubjectInput,
} from '@/domains/storyteller/services/visual-subject-llm'
import type { VisualOverviewContext } from '@/domains/storyteller/services/visual-overview-context'

export type MoodboardProjectContext = VisualOverviewContext

export enum MoodboardPromptSlot {
  Environment = 'Environment',
  DailyLife = 'Daily Life',
  CharacterPortrait = 'Character Portrait',
}

export enum MoodboardFallbackScene {
  Environment = 'storm basalt lighthouse',
  DailyLife = 'windswept harbor market',
  CharacterPortrait = 'hooded cliff keeper',
}

const MOODBOARD_PROMPT_SLOTS = [
  MoodboardPromptSlot.Environment,
  MoodboardPromptSlot.DailyLife,
  MoodboardPromptSlot.CharacterPortrait,
] as const

const MOODBOARD_FALLBACKS = [
  MoodboardFallbackScene.Environment,
  MoodboardFallbackScene.DailyLife,
  MoodboardFallbackScene.CharacterPortrait,
] as const

function moodboardSubjectInput(
  context: MoodboardProjectContext,
  promptIndex?: number,
): GenerateVisualSubjectInput {
  return {
    context,
    slots: MOODBOARD_PROMPT_SLOTS,
    slotIndex: promptIndex,
    fallbacks: MOODBOARD_FALLBACKS,
  }
}

export function buildFallbackPrompts(
  _context: MoodboardProjectContext,
  promptIndex?: number,
): string[] {
  if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < MOODBOARD_FALLBACKS.length) {
    return [MOODBOARD_FALLBACKS[promptIndex]]
  }
  return [...MOODBOARD_FALLBACKS]
}

export async function generateMoodboardPrompts(
  scope: ProjectScope,
  context: MoodboardProjectContext,
  promptIndex?: number,
): Promise<string[]> {
  if (!createVisualSubjectClient()) return buildFallbackPrompts(context, promptIndex)
  return generateVisualSubjects(scope, moodboardSubjectInput(context, promptIndex))
}

export function lockedMoodboardPromptsOrNull(prompts: string[] | undefined): string[] | null {
  const existing = (prompts ?? []).map(prompt => prompt.trim()).filter(prompt => prompt.length > 0)
  return existing.length > 0 ? existing : null
}

export async function resolveMoodboardPrompts(input: {
  prompts?: string[]
  promptIndex?: number
  worldDesc?: string
  overview?: string
  projectId: string
}): Promise<string[]> {
  const locked = lockedMoodboardPromptsOrNull(input.prompts)
  if (locked) return locked
  return generateMoodboardPrompts(
    // No user behind a background job; the payload carries the project it bills
    // to, and SPEC-06 made that field required on every task.
    systemScope(input.projectId, SystemScopeReason.JobContext),
    {
      worldDesc: input.worldDesc ?? '',
      overview: input.overview ?? '',
    },
    input.promptIndex,
  )
}

export function moodboardReplaceStyleRef(
  bible: Record<string, unknown>,
  storyPlan: Record<string, unknown> | undefined,
  promptIndex: unknown,
): { replaceIndex: number | undefined; styleReferenceUrl: string | undefined } {
  const moodImages = stringArrayFromJson(bible.moodImages)
  const planImages = stringArrayFromJson(storyPlan?.moodImages)
  const existingImages = moodImages.length > 0 ? moodImages : planImages
  const replaceIndex = typeof promptIndex === 'number' ? promptIndex : undefined
  const styleReferenceUrl =
    typeof replaceIndex === 'number' && replaceIndex > 0
      ? firstMoodboardStyleRefUrl(existingImages)
      : undefined
  return { replaceIndex, styleReferenceUrl }
}
