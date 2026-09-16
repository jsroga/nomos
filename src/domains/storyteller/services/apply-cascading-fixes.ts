import '@/shared/data/server-guard'
import { set } from 'lodash'
import { eq } from 'drizzle-orm'
import { db } from '@/shared/persistence'
import { beats, characters, episodes, projects } from '@/db/schema'
import {
  persistEpisodePremiseUpdate,
  persistStoryPlanUpdates,
} from '@/domains/storyteller/ai/tools/bible-tools-update'
import { CascadeEditorError, CascadeElementType } from '@/domains/storyteller/core/constants/cascade-editor'
import { pickBeatPatchUpdates } from '@/domains/storyteller/core/beat-patch'
import { buildCharacterPatchUpdates } from '@/domains/storyteller/core/character-patch'
import { EPISODE_PATCH_ALLOWED_COLUMNS } from '@/domains/storyteller/core/io/episode-patch'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { projectIdForBeat, upsertSetupsFromBeat } from '@/domains/storyteller/core/io/setups-write'
import { omitBibleOwnedPlanFields } from '@/domains/storyteller/core/utils/bible-populated-fields'
import type {
  AppliedFix,
  CascadeResult,
  ConsistencyChange,
  ConsistencyFix,
} from '@/domains/storyteller/core/types/consistency-types'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { recordFromJson, readString } from '@/shared/data/json-guards'

export async function applyCascadingFixes(
  fixes: ConsistencyFix[],
  scope: ProjectScope,
  episodeId?: string
): Promise<CascadeResult> {
  const results: AppliedFix[] = []
  const errors: string[] = []

  for (const fix of fixes) {
    try {
      await applyFix(fix, scope, episodeId)
      results.push({
        ...fix,
        applied: true,
        appliedAt: Date.now(),
      })
    } catch (error) {
      console.error(`[Cascade Editor] Failed to apply fix ${fix.id}:`, error)
      errors.push(
        `Failed to apply fix to ${fix.targetElement.type} ${fix.targetElement.id}: ${error}`
      )
      results.push({
        ...fix,
        applied: false,
        error: String(error),
      })
    }
  }

  return {
    results,
    totalAffected: results.filter(r => r.applied).length,
    errors: errors.length > 0 ? errors : undefined,
  }
}

async function applyFix(fix: ConsistencyFix, scope: ProjectScope, episodeId?: string): Promise<void> {
  const { targetElement, changes } = fix
  const projectId = scope.projectId

  switch (targetElement.type) {
    case CascadeElementType.Character:
      await updateCharacter(targetElement.id, changes)
      break
    case CascadeElementType.Beat:
      await updateBeat(targetElement.id, changes)
      break
    case CascadeElementType.Episode:
      await updateEpisode(targetElement.id, changes)
      break
    case CascadeElementType.WorldRule:
      await updateWorldRules(changes, projectId)
      break
    case CascadeElementType.Premise:
      await updatePremise(changes, episodeId)
      break
    default:
      throw new Error(`Unknown element type: ${targetElement.type}`)
  }
}

async function updateCharacter(characterId: string, changes: ConsistencyChange[]): Promise<void> {
  const [row] = await db.select().from(characters).where(eq(characters.id, characterId))
  if (!row) throw new Error(CascadeEditorError.FailedFetchCharacter)
  const dbUpdates = buildCharacterPatchUpdates(applyChangesToObject(recordFromJson(row), changes))
  if (Object.keys(dbUpdates).length === 0) throw new Error(CascadeEditorError.FailedSaveCharacter)
  await db.update(characters).set(dbUpdates).where(eq(characters.id, characterId))
}

async function updateBeat(beatId: string, changes: ConsistencyChange[]): Promise<void> {
  const [row] = await db.select().from(beats).where(eq(beats.id, beatId))
  if (!row) throw new Error(CascadeEditorError.FailedFetchBeats)
  const update = pickBeatPatchUpdates(applyChangesToObject(recordFromJson(row), changes))
  if (Object.keys(update).length === 0) throw new Error(CascadeEditorError.FailedSaveBeat)
  await db.update(beats).set(update).where(eq(beats.id, beatId))
  if (update.setupsPayoffs === undefined) return
  const setupsPayoffs = recordFromJson(update.setupsPayoffs)
  const projectId = await projectIdForBeat(beatId)
  if (!projectId) return
  await upsertSetupsFromBeat({
    projectId,
    beatId,
    setupId: readString(setupsPayoffs.setupId),
    payoffFor: readString(setupsPayoffs.payoffFor),
  })
}

async function updateEpisode(episodeId: string, changes: ConsistencyChange[]): Promise<void> {
  const [row] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
  if (!row) throw new Error(CascadeEditorError.FailedFetchEpisode)
  const updated = applyChangesToObject(recordFromJson(row), changes)
  const updateData: Record<string, unknown> = {}
  for (const column of EPISODE_PATCH_ALLOWED_COLUMNS) {
    if (updated[column] !== undefined) updateData[column] = updated[column]
  }
  if (Object.keys(updateData).length === 0) throw new Error(CascadeEditorError.FailedSaveEpisode)
  await db.update(episodes).set(updateData).where(eq(episodes.id, episodeId))
}

async function updateWorldRules(changes: ConsistencyChange[], projectId: string): Promise<void> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project) throw new Error(CascadeEditorError.FailedFetchSeriesBible)
  const bible = parseSeriesBibleRecord(project.seriesBible)
  const updated = applyChangesToObject(bible, changes)
  await persistStoryPlanUpdates(projectId, recordFromJson(project.storyPlan), updated)
}

async function updatePremise(changes: ConsistencyChange[], episodeId?: string): Promise<void> {
  if (!episodeId) throw new Error(CascadeEditorError.EpisodeIdRequiredForPremise)
  const [row] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
  if (!row) throw new Error(CascadeEditorError.FailedFetchPlan)
  const updated = applyChangesToObject(recordFromJson(row.storyPlan), changes)
  const premise = recordFromJson(updated.premise)
  if (Object.keys(premise).length > 0) {
    await persistEpisodePremiseUpdate(episodeId, premise)
    return
  }
  await db
    .update(episodes)
    .set({
      storyPlan: omitBibleOwnedPlanFields(updated),
      updatedAt: new Date(),
    })
    .where(eq(episodes.id, episodeId))
}

function applyChangesToObject(
  obj: Record<string, unknown>,
  changes: ConsistencyChange[]
): Record<string, unknown> {
  const result = structuredClone(obj)
  for (const change of changes) {
    set(result, change.path, change.after)
  }
  return result
}

export async function revertFix(
  fix: AppliedFix,
  scope: ProjectScope,
  episodeId?: string
): Promise<void> {
  const reverseChanges = fix.changes.map(change => ({
    ...change,
    after: change.before,
    before: change.after,
  }))
  await applyFix({ ...fix, changes: reverseChanges }, scope, episodeId)
}
