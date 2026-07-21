import type { StreamAgentAction } from '@/domains/storyteller/core/types/action-types'
import type { StoryPlan } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import { storytellerCharacterFromRow } from '@/domains/storyteller/core/entities/character-wire'
import { applyUpdatesToStoryPlan } from '@/domains/storyteller/config/action-config'
import { fetchStorytellerCharacters } from '@/domains/storyteller/core/io/character.api'
import { parseSeriesBibleRecord, parseStoryPlanRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { recordFromJson, stringRecordFromJson } from '@/shared/data/deep-merge'
import { readString } from '@/shared/data/json-guards'
import { recordFromJson as jsonRecordFromJson } from '@/shared/data/json-guards'
import type { ProjectLike } from '@/domains/storyteller/state/queries/useStorytellerActions'
import {
  StorytellerActionExtraResultType,
  StorytellerActionResultType,
  StorytellerActionType,
  StorytellerActionsLog,
  StorytellerActionsUpdatePrefix,
} from '@/domains/storyteller/state/constants/storyteller-actions'

export interface ApplyActionResultContext {
  action: StreamAgentAction
  result: Record<string, unknown>
  resultType: string | undefined
  currentProject: ProjectLike
  setStoryPlan: React.Dispatch<React.SetStateAction<StoryPlan | null>>
  setStoryDecisions: React.Dispatch<React.SetStateAction<Record<string, string>>>
  setCharacters: React.Dispatch<React.SetStateAction<StorytellerCharacter[]>>
  setScript: React.Dispatch<React.SetStateAction<string>>
  setCurrentProject: (project: ProjectLike) => void
}

function isBeatResult(resultType: string | undefined, action: StreamAgentAction): boolean {
  return (
    resultType === StorytellerActionResultType.BEAT_CREATED ||
    resultType === StorytellerActionResultType.BEAT_UPDATED ||
    resultType === StorytellerActionResultType.BEAT_DELETED ||
    action.type === StorytellerActionType.CREATE_BEAT
  )
}

function isBibleUpdatedResult(resultType: string | undefined): boolean {
  return (
    resultType === StorytellerActionResultType.BIBLE_UPDATED ||
    resultType === StorytellerActionExtraResultType.WorldRuleAdded
  )
}

function isSeriesBibleUpdate(action: StreamAgentAction): boolean {
  return (
    action.type === StorytellerActionType.UPDATE_SERIES_BIBLE ||
    action.type.startsWith(StorytellerActionsUpdatePrefix.Update)
  )
}

function applyBibleUpdatedResult(ctx: ApplyActionResultContext): void {
  const seriesBible = jsonRecordFromJson(ctx.result.seriesBible)
  if (Object.keys(seriesBible).length === 0) return

  console.log(StorytellerActionsLog.BibleUpdatedApplying, Object.keys(seriesBible))

  ctx.setStoryDecisions(prev => ({ ...prev, ...(seriesBible.userDecisions || {}) }))

  ctx.setStoryPlan(prev => {
    const storyPlanUpdates = seriesBible.storyPlan || {}
    const directUpdates = { ...seriesBible }
    delete directUpdates.storyPlan
    const allUpdates = { ...storyPlanUpdates, ...directUpdates }
    const updated = applyUpdatesToStoryPlan(prev, allUpdates)
    console.log(
      StorytellerActionsLog.BibleUpdatedAppliedFields,
      Object.keys(updated).filter(k => updated[k])
    )
    return updated
  })

  if (ctx.action.type === StorytellerActionType.UPDATE_EPISODE_ROADMAP && seriesBible.storyPlan) {
    const plan = parseStoryPlanRecord(seriesBible.storyPlan)
    ctx.setStoryPlan(prev => {
      const prevRecord = recordFromJson(prev)
      return Object.assign({}, prev, {
        sequences: plan.sequences || prevRecord.sequences,
        episodeRoadmap: plan.episodeRoadmap || prevRecord.episodeRoadmap,
        seasonStructure: plan.seasonStructure || prevRecord.seasonStructure,
        executiveSummary: plan.executiveSummary || prevRecord.executiveSummary,
      })
    })
  }

  if (ctx.result.characters_synced === true && ctx.currentProject.id) {
    console.log(StorytellerActionsLog.CharactersSyncedRefetch)
    fetchStorytellerCharacters(ctx.currentProject.id)
      .then(charData => {
        if (!Array.isArray(charData)) return
        const mapped = charData
          .map(row => storytellerCharacterFromRow(row))
          .filter((character): character is StorytellerCharacter => character !== null)
        ctx.setCharacters(mapped)
      })
      .catch(e => console.error(StorytellerActionsLog.FailedRefetchCharacters, e))
  }
}

function applySeriesBibleUpdate(ctx: ApplyActionResultContext): void {
  const payload = recordFromJson(ctx.action.payload)
  const payloadFields = payload.updatedFields
    ? recordFromJson(payload.updatedFields)
    : payload

  console.log(
    `${StorytellerActionsLog.ApplyingUpdate} ${ctx.action.type} update to state:`,
    Object.keys(payloadFields)
  )

  ctx.setStoryDecisions(prev => ({
    ...prev,
    ...stringRecordFromJson(payloadFields.userDecisions),
  }))

  ctx.setStoryPlan(prev => {
    const updated = applyUpdatesToStoryPlan(prev, payloadFields)
    console.log(
      StorytellerActionsLog.UpdatedStoryPlanFields,
      Object.keys(updated).filter(k => updated[k])
    )
    return updated
  })

  const mergedBible = {
    ...parseSeriesBibleRecord(ctx.currentProject.series_bible),
    ...payloadFields,
  }
  ctx.setCurrentProject({
    ...ctx.currentProject,
    series_bible: mergedBible,
  })
}

function applyScriptUpdatedResult(ctx: ApplyActionResultContext): void {
  const script = readString(ctx.result.script)
  if (script) {
    ctx.setScript(script)
    return
  }
  const seriesBible = jsonRecordFromJson(ctx.result.seriesBible)
  const bibleScript = readString(seriesBible.script)
  if (bibleScript) ctx.setScript(bibleScript)
}

function applyEpisodeUpdatedResult(ctx: ApplyActionResultContext): void {
  console.log(StorytellerActionsLog.EpisodeUpdatedApplying)
  const storyPlanUpdate = jsonRecordFromJson(ctx.result.storyPlan)
  if (Object.keys(storyPlanUpdate).length === 0) return

  ctx.setStoryPlan(prev =>
    Object.assign({}, prev, storyPlanUpdate, {
      premise: storyPlanUpdate.premise || recordFromJson(prev).premise,
    })
  )
}

export function applyStorytellerActionResult(ctx: ApplyActionResultContext): void {
  const { resultType, action } = ctx

  if (isBeatResult(resultType, action)) return
  if (isBibleUpdatedResult(resultType)) {
    applyBibleUpdatedResult(ctx)
    return
  }
  if (isSeriesBibleUpdate(action)) {
    applySeriesBibleUpdate(ctx)
    return
  }
  if (resultType === StorytellerActionResultType.SCRIPT_UPDATED) {
    applyScriptUpdatedResult(ctx)
    return
  }
  if (resultType === StorytellerActionResultType.EPISODE_UPDATED) {
    applyEpisodeUpdatedResult(ctx)
  }
}
