import { NextResponse } from 'next/server'
import { ActionType, isActionType } from '@/domains/storyteller/core/types/enums'
import { recordFromJson } from '@/shared/data/deep-merge'
import { ActionRequestField, ActionWireField } from './constants/action-request-wire'
import type { ActionHandler, ActionHandlerContext, StorytellerAction } from './action-handler-context'
import {
  handleCreateBeat,
  handleDeleteBeat,
  handleReorderBeat,
  handleUpdateBeat,
} from './handlers/beat-handlers'
import {
  handleCreateCharacter,
  handleUpdateCharacterProfile,
} from './handlers/character-handlers'
import { handleDefaultAction } from './handlers/default-handler'
import { handleUpdateScript } from './handlers/script-handlers'
import { handleStoryPlanPartialUpdate } from './handlers/story-plan-partial-update-handler'
import { handleUpdateCast } from './handlers/update-cast-handler'
import { handleUpdateEpisodePremise } from './handlers/update-episode-premise-handler'
import { handleUpdateEpisodeRoadmap } from './handlers/update-episode-roadmap-handler'
import { handleUpdateRoadmapSummary } from './handlers/update-roadmap-summary-handler'
import { handleUpdateSeriesBible } from './handlers/update-series-bible-handler'

function assignHandler(
  handlers: Partial<Record<ActionType, ActionHandler>>,
  type: ActionType,
  handler: ActionHandler
) {
  handlers[type] = handler
}

function assignSharedHandler(
  handlers: Partial<Record<ActionType, ActionHandler>>,
  handler: ActionHandler,
  types: ActionType[]
) {
  for (const type of types) {
    handlers[type] = handler
  }
}

const ACTION_HANDLERS: Partial<Record<ActionType, ActionHandler>> = {}

assignHandler(ACTION_HANDLERS, ActionType.UPDATE_SERIES_BIBLE, handleUpdateSeriesBible)
assignHandler(ACTION_HANDLERS, ActionType.UPDATE_CAST, handleUpdateCast)
assignHandler(ACTION_HANDLERS, ActionType.UPDATE_EPISODE_ROADMAP, handleUpdateEpisodeRoadmap)
assignHandler(ACTION_HANDLERS, ActionType.UPDATE_ROADMAP_SUMMARY, handleUpdateRoadmapSummary)
assignHandler(ACTION_HANDLERS, ActionType.UPDATE_EPISODE_PREMISE, handleUpdateEpisodePremise)
assignHandler(ACTION_HANDLERS, ActionType.CREATE_BEAT, handleCreateBeat)
assignHandler(ACTION_HANDLERS, ActionType.DELETE_BEAT, handleDeleteBeat)
assignHandler(ACTION_HANDLERS, ActionType.REORDER_BEAT, handleReorderBeat)
assignHandler(ACTION_HANDLERS, ActionType.CREATE_CHARACTER, handleCreateCharacter)
assignHandler(ACTION_HANDLERS, ActionType.UPDATE_CHARACTER_PROFILE, handleUpdateCharacterProfile)

assignSharedHandler(ACTION_HANDLERS, handleUpdateBeat, [
  ActionType.UPDATE_BEAT,
  ActionType.UPDATE_BEAT_CONTENT,
])
assignSharedHandler(ACTION_HANDLERS, handleUpdateScript, [
  ActionType.UPDATE_SCRIPT,
  ActionType.UPDATE_SCRIPT_CONTENT,
])
assignSharedHandler(ACTION_HANDLERS, handleStoryPlanPartialUpdate, [
  ActionType.UPDATE_WORLD_RULES,
  ActionType.UPDATE_FACTIONS,
  ActionType.UPDATE_INSPIRATIONS,
  ActionType.UPDATE_WORLD_DESCRIPTION,
  ActionType.UPDATE_PLOT_TWISTS,
  ActionType.UPDATE_SOUNDTRACKS,
  ActionType.ADD_WORLD_RULE,
  ActionType.ADD_THEME,
  ActionType.REMOVE_THEME,
  ActionType.SET_GENRE_AND_TONE,
])

export function parseStorytellerAction(body: Record<string, unknown>): StorytellerAction | null {
  const actionRaw = body[ActionRequestField.Action]
  if (!actionRaw || typeof actionRaw !== 'object' || Array.isArray(actionRaw)) {
    return null
  }

  const actionObj = recordFromJson(actionRaw)
  const typeValue = actionObj[ActionWireField.Type]
  if (typeof typeValue !== 'string' || !isActionType(typeValue)) {
    return null
  }

  return {
    type: typeValue,
    payload: recordFromJson(actionObj[ActionWireField.Payload]),
  }
}

export async function dispatchStorytellerAction(
  ctx: ActionHandlerContext,
  action: StorytellerAction
): Promise<NextResponse> {
  const handler = ACTION_HANDLERS[action.type] ?? handleDefaultAction
  return handler(ctx, action)
}
