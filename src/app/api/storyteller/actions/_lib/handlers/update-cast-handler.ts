import { NextResponse } from 'next/server'
import { ActionApiResultType } from '@/shared/data/constants/protocol'
import { API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import type { ActionHandler } from '../action-handler-context'
import { resolveCastData, syncCastToCharactersTable } from './sync-cast-characters'

export const handleUpdateCast: ActionHandler = async (ctx, action) => {
  console.log(API_LOG_PREFIX.ACTIONS_UPDATE_CAST_KEYS, Object.keys(action.payload || {}))
  if (action.payload.cast && Array.isArray(action.payload.cast)) {
    console.log(API_LOG_PREFIX.ACTIONS_UPDATE_CAST_LENGTH, action.payload.cast.length)
  }
  if (action.payload.keyCharacters && Array.isArray(action.payload.keyCharacters)) {
    console.log(API_LOG_PREFIX.ACTIONS_UPDATE_CAST_KEY_CHARS, action.payload.keyCharacters.length)
  }

  const castData = resolveCastData(action.payload)
  const updates = { cast: castData }
  console.log(`💾 [API] UPDATE_CAST - Saving ${Array.isArray(updates.cast) ? updates.cast.length : 0} characters`)
  const updated = await ctx.updateStoryPlan(updates)

  await syncCastToCharactersTable(ctx.projectId, castData)

  return NextResponse.json({
    success: true,
    result: {
      type: ActionApiResultType.BIBLE_UPDATED,
      seriesBible: { storyPlan: updated },
      characters_synced: true,
    },
  })
}
