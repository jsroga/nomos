import { readString } from '@/shared/data/json-guards'
import { loadStoryCanonPack } from '@/domains/storyteller/services/story-canon-pack'
import { VisualOverviewLabel } from '@/domains/storyteller/services/constants/visual-overview'

export interface VisualOverviewContext {
  worldDesc: string
  overview: string
}

export function buildVisualOverviewText(input: {
  executiveSummary?: string | null
  centralQuestion?: string | null
}): string {
  return [input.executiveSummary, input.centralQuestion]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0))
    .join('\n')
}

export function buildVisualOverviewContext(input: {
  bibleWorldDescription?: string | null
  executiveSummary?: string | null
  centralQuestion?: string | null
}): VisualOverviewContext {
  return {
    worldDesc: input.bibleWorldDescription?.trim() ?? '',
    overview: buildVisualOverviewText({
      executiveSummary: input.executiveSummary,
      centralQuestion: input.centralQuestion,
    }),
  }
}

export function isVisualOverviewReady(context: VisualOverviewContext): boolean {
  return context.worldDesc.trim().length > 0
}

export function formatVisualOverviewBlock(context: VisualOverviewContext): string {
  const lines = [`${VisualOverviewLabel.World}: ${context.worldDesc}`]
  const overview = context.overview.trim()
  if (overview.length > 0) {
    lines.push(`${VisualOverviewLabel.Overview}: ${overview}`)
  }
  return lines.join('\n')
}

export function visualOverviewFromCanon(
  bible: Record<string, unknown>,
  pack: { worldDescription?: string; storyPlan?: Record<string, unknown> } | null,
): VisualOverviewContext {
  const storyPlan = pack?.storyPlan
  return buildVisualOverviewContext({
    bibleWorldDescription: pack?.worldDescription || readString(bible.worldDescription),
    executiveSummary:
      readString(storyPlan?.executiveSummary) || readString(bible.executiveSummary),
    centralQuestion:
      readString(storyPlan?.centralQuestion) || readString(bible.centralQuestion),
  })
}

export async function loadVisualOverviewContext(projectId: string): Promise<{
  context: VisualOverviewContext
  pack: Awaited<ReturnType<typeof loadStoryCanonPack>>
}> {
  const pack = await loadStoryCanonPack(projectId)
  return {
    context: visualOverviewFromCanon(pack?.bible ?? {}, pack),
    pack,
  }
}
