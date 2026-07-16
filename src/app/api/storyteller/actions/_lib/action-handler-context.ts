import type { NextResponse } from 'next/server'
import { ActionType } from '@/domains/storyteller/core/types/enums'

export interface StorytellerAction {
  type: ActionType
  payload: Record<string, unknown>
}

export interface ActionHandlerContext {
  projectId: string | undefined
  episodeId: string | undefined
  updateSeriesBible: (updates: Record<string, unknown>) => Promise<Record<string, unknown>>
  updateStoryPlan: (updates: Record<string, unknown>) => Promise<Record<string, unknown>>
}

export type ActionHandler = (
  ctx: ActionHandlerContext,
  action: StorytellerAction
) => Promise<NextResponse>
