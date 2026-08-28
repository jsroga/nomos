import { complete } from '@/shared/ai/gateway'
import { LlmFeature } from '@/shared/ai/gateway/constants/llm-call'
import { TEXT_GEN_FAST_MODEL, openRouterClientConfig } from '@/shared/agent-kernel/models'
import type { ProjectScope } from '@/shared/auth/project-scope'
import {
  VisualOverviewLabel,
  VisualSubjectCopy,
  VisualSubjectKind,
  VisualSubjectLog,
  normalizeVisualSubject,
} from '@/domains/storyteller/services/constants/visual-overview'
import {
  formatVisualOverviewBlock,
  isVisualOverviewReady,
  loadVisualOverviewContext,
  type VisualOverviewContext,
} from '@/domains/storyteller/services/visual-overview-context'

export interface GenerateVisualSubjectInput {
  context: VisualOverviewContext
  extra?: string
  kind?: VisualSubjectKind
  slots?: readonly string[]
  slotIndex?: number
  fallbacks: readonly string[]
}

/**
 * Kept so routes can still refuse early when no key is configured. Returns a
 * boolean now — the gateway owns the client.
 */
export function isVisualSubjectConfigured(): boolean {
  return Boolean(openRouterClientConfig().apiKey)
}

function slotInstruction(slot: string): string {
  return `Category: ${slot}. ${VisualSubjectCopy.SlotRule}`
}

function subjectLead(input: GenerateVisualSubjectInput): string {
  if (input.kind === VisualSubjectKind.Portrait) return VisualSubjectCopy.Portrait
  if (input.kind === VisualSubjectKind.Poster) return VisualSubjectCopy.Poster
  if ((input.slots ?? []).length > 0 && typeof input.slotIndex !== 'number') {
    return VisualSubjectCopy.Batch
  }
  return VisualSubjectCopy.Single
}

function extraLabelForKind(kind: VisualSubjectKind | undefined): VisualOverviewLabel {
  if (kind === VisualSubjectKind.Portrait) return VisualOverviewLabel.Character
  if (kind === VisualSubjectKind.Poster) return VisualOverviewLabel.Episode
  return VisualOverviewLabel.Focus
}

export function buildVisualSubjectSystemPrompt(input: GenerateVisualSubjectInput): string {
  const projectBlock = formatVisualOverviewBlock(input.context)
  const extra = input.extra?.trim() ?? ''
  const extraLabel = extraLabelForKind(input.kind)
  const focusBlock = extra ? `\n${extraLabel}: ${extra}` : ''
  const slots = input.slots ?? []
  const slotIndex = input.slotIndex
  const lead = subjectLead(input)

  if (typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < slots.length) {
    return `${lead}
${projectBlock}${focusBlock}
${slotInstruction(slots[slotIndex])}`
  }

  if (slots.length > 0) {
    const numbered = slots.map((slot, index) => `${index + 1}. ${slot}`).join('\n')
    return `${lead}
${projectBlock}${focusBlock}
${numbered}`
  }

  return `${lead}
${projectBlock}${focusBlock}`
}

export function fallbackVisualSubjects(input: GenerateVisualSubjectInput): string[] {
  const fallbacks = input.fallbacks.map(normalizeVisualSubject).filter(scene => scene.length > 0)
  const slots = input.slots ?? []
  const slotIndex = input.slotIndex
  if (typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < fallbacks.length) {
    return [fallbacks[slotIndex]]
  }
  if (slots.length > 0) return fallbacks.slice(0, slots.length)
  return fallbacks.slice(0, 1)
}

function parseSubjectArray(content: string, input: GenerateVisualSubjectInput): string[] {
  try {
    const cleanContent = content.replace(/```json/g, '').replace(/```/g, '').trim()
    const parsed: unknown = JSON.parse(cleanContent)
    if (!Array.isArray(parsed)) {
      return fallbackVisualSubjects(input)
    }
    const prompts = parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map(normalizeVisualSubject)
      .filter(scene => scene.length > 0)
    return prompts.length > 0 ? prompts : fallbackVisualSubjects(input)
  } catch (error) {
    console.warn(VisualSubjectLog.ParseFallback, error)
    return fallbackVisualSubjects(input)
  }
}

export async function generateVisualSubjects(
  scope: ProjectScope,
  input: GenerateVisualSubjectInput,
): Promise<string[]> {
  const fallbacks = fallbackVisualSubjects(input)
  try {
    const { text } = await complete({
      scope,
      feature: LlmFeature.StorytellerVisualSubject,
      model: TEXT_GEN_FAST_MODEL,
      system: buildVisualSubjectSystemPrompt(input),
      prompt: VisualSubjectCopy.SlotRule,
      temperature: 0.7,
    })
    const content = text.trim()
    const slots = input.slots ?? []
    const slotIndex = input.slotIndex
    const isSingle =
      slots.length === 0 ||
      (typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < slots.length)
    if (isSingle) {
      const stripped = normalizeVisualSubject(content)
      return stripped.length > 0 ? [stripped] : fallbacks
    }
    return parseSubjectArray(content, input)
  } catch (openaiError) {
    console.error(VisualSubjectLog.OpenAiFailed, openaiError)
    return fallbacks
  }
}

export async function generateOverviewVisualSubject(
  scope: ProjectScope,
  extra?: string,
  kind: VisualSubjectKind = VisualSubjectKind.Scene,
): Promise<string | null> {
  const { context } = await loadVisualOverviewContext(scope)
  if (!isVisualOverviewReady(context)) return null
  const fallbackSource = extra?.trim() || context.worldDesc
  const [scene] = await generateVisualSubjects(scope, {
    context,
    extra,
    kind,
    fallbacks: [fallbackSource],
  })
  return scene ?? null
}
