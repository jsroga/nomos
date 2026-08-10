import {
  findSectionConfigByFields,
  processToolResultToAction,
} from '@/domains/storyteller/config/action-config'
import type { ProposedBibleSectionUpdate } from '@/domains/storyteller/state/utils/propose-assistant-bible-update'
import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { UPDATE_WORLD_BIBLE_TOOL_ID } from '@/domains/storyteller/ai/tools/manage-tools-wire'
import { AssistantGenerationPhase } from '@/shared/chat/assistant/derive-assistant-generation-activity'
import { GenerationActivityPhase } from '@/domains/storyteller/state/constants/storyteller-ui-store'

export function omitSectionKey<V>(
  current: Record<string, V>,
  section: string,
): Record<string, V> {
  const next: Record<string, V> = {}
  for (const key of Object.keys(current)) {
    if (key === section) continue
    const value = current[key]
    if (value !== undefined) next[key] = value
  }
  return next
}

export function previewAlreadyInPlan(
  preview: Record<string, unknown>,
  plan: Record<string, unknown>,
): boolean {
  for (const key of Object.keys(preview)) {
    if (JSON.stringify(plan[key]) !== JSON.stringify(preview[key])) return false
  }
  return Object.keys(preview).length > 0
}

export function proposalsFromExtraFields(
  extraFields: Record<string, unknown>,
  episodeId?: string | null,
): ProposedBibleSectionUpdate[] {
  const proposals: ProposedBibleSectionUpdate[] = []
  const keys = Object.keys(extraFields)
  const claimed = new Set<string>()

  while (claimed.size < keys.length) {
    const remaining = keys.filter(key => !claimed.has(key))
    if (remaining.length === 0) break
    const config = findSectionConfigByFields(remaining)
    if (!config || config.section === BibleSection.FULL) break

    const sectionPreview: Record<string, unknown> = {}
    for (const name of config.fieldNames) {
      if (extraFields[name] !== undefined) {
        sectionPreview[name] = extraFields[name]
        claimed.add(name)
      }
    }
    if (Object.keys(sectionPreview).length === 0) break

    const processed = processToolResultToAction(
      UPDATE_WORLD_BIBLE_TOOL_ID,
      sectionPreview,
      episodeId,
    )
    if (!processed?.actionType) break

    const contentPreview = JSON.stringify(sectionPreview).slice(0, 120)
    proposals.push({
      section: config.section,
      action: {
        type: processed.actionType,
        payload: processed.payload,
        status: ApprovalActionStatus.PENDING,
        id: `assistant-bible-extra-${config.section}-${Date.now()}`,
      },
      preview: sectionPreview,
      dedupeKey: `${UPDATE_WORLD_BIBLE_TOOL_ID}:${config.section}:${contentPreview}`,
    })
  }

  return proposals
}

export function mapAssistantPhase(phase: AssistantGenerationPhase): GenerationActivityPhase {
  switch (phase) {
    case AssistantGenerationPhase.Idle:
      return GenerationActivityPhase.Idle
    case AssistantGenerationPhase.Submitted:
      return GenerationActivityPhase.Submitted
    case AssistantGenerationPhase.Streaming:
      return GenerationActivityPhase.Streaming
    case AssistantGenerationPhase.Tool:
      return GenerationActivityPhase.Tool
    case AssistantGenerationPhase.Error:
      return GenerationActivityPhase.Error
  }
}
