import { bibleToPrompt, bibleToVisualPrompt, ragService } from '@/domains/storyteller/server'
import type { SeriesBible, WorldRule } from '@/domains/storyteller/services/context/series-bible'
import {
  StorytellerRagEntityType,
  StorytellerRagQuery,
  StorytellerRagSummaryFormat,
  StorytellerTextSeparator,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import type { WorldSummaryCastMember } from './fetch-project-cast'
import type { ProjectScope } from '@/shared/auth/project-scope'

function worldRuleText(rule: WorldRule | string): string {
  if (typeof rule === 'string') return rule
  return rule.description || rule.name || ''
}

export function buildContextSnippet(bible: SeriesBible): string {
  return [
    bible.worldDescription,
    bible.setting?.place,
    bible.setting?.time,
    bible.setting?.socialContext,
    ...(bible.worldRules?.slice(0, 3).map(worldRuleText) ?? []),
    ...(bible.visualMotifs?.slice(0, 4) ?? []),
    ...(bible.colorPalette?.slice(0, 4) ?? []),
    bible.tone?.join(StorytellerTextSeparator.CommaSpace),
  ]
    .filter(Boolean)
    .join(StorytellerTextSeparator.PeriodSpace)
}

async function appendRagContext(scope: ProjectScope, summary: string): Promise<string> {
  try {
    const ragResults = await ragService.retrieveByType(
      scope,
      StorytellerRagEntityType.WorldRule,
      StorytellerRagQuery.WorldLogic,
      3,
    )

    if (ragResults.length === 0) return summary

    let enriched = summary + StorytellerRagSummaryFormat.ContextHeader
    for (const result of ragResults) {
      enriched += `${StorytellerRagSummaryFormat.BulletPrefix}${result.content}${StorytellerRagSummaryFormat.LineBreak}`
    }
    return enriched
  } catch (error) {
    console.warn(API_LOG_PREFIX.WORLD_SUMMARY_RAG_FAILED, error)
    return summary
  }
}

export async function buildWorldSummaryContent(
  scope: ProjectScope,
  bible: SeriesBible,
  cast: WorldSummaryCastMember[],
): Promise<{ summary: string; fallbackPrompt: string }> {
  const summary = await appendRagContext(scope, bibleToPrompt(bible, cast))
  const fallbackPrompt = bibleToVisualPrompt(bible, cast)
  return { summary, fallbackPrompt }
}
