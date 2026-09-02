import { episodes, projects } from '@/db'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { NextResponse } from 'next/server'
import {
  ActionApiResultType,
  StringSeparator,
} from '@/shared/data/constants/protocol'
import { recordFromJson } from '@/shared/data/deep-merge'
import type { ActionHandler } from '../action-handler-context'
import { readSqlId } from '../read-payload-fields'

function mergeScriptContent(currentScript: string, content: unknown, append: unknown): string {
  const nextContent = typeof content === 'string' ? content : ''
  if (append) {
    return currentScript + StringSeparator.DoubleNewline + nextContent
  }
  return nextContent
}

export const handleUpdateScript: ActionHandler = async (ctx, action) => {
  const { content, append } = action.payload

  if (ctx.episodeId) {
    const [episode] = await db
      .select()
      .from(episodes)
      .where(eq(episodes.id, ctx.episodeId))
      .limit(1)
    const currentScript = episode?.scriptContent || ''
    const newScript = mergeScriptContent(currentScript, content, append)
    await db
      .update(episodes)
      .set({ scriptContent: newScript, updatedAt: new Date() })
      .where(eq(episodes.id, ctx.episodeId))
    return NextResponse.json({
      success: true,
      result: { type: ActionApiResultType.SCRIPT_UPDATED, script: newScript },
    })
  }

  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, readSqlId(ctx.scope?.projectId)))
    .limit(1)
  const currentBible = recordFromJson(project?.seriesBible)
  const currentScript = typeof currentBible.script === 'string' ? currentBible.script : ''
  const newScript = mergeScriptContent(currentScript, content, append)
  const updatedBible = await ctx.updateSeriesBible({ script: newScript })
  return NextResponse.json({
    success: true,
    result: { type: ActionApiResultType.SCRIPT_UPDATED, seriesBible: updatedBible },
  })
}
