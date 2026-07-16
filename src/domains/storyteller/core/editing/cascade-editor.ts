/**
 * Cascade Editor
 *
 * Applies consistency fixes across multiple story elements.
 * Handles updates to characters, beats, world rules, and episodes.
 */

import {
  ConsistencyFix,
  ConsistencyChange,
  CascadeResult,
  AppliedFix,
} from '@/domains/storyteller/core/types/consistency-types'
import { recordArrayFromJson, recordFromJson, readString } from '@/shared/data/json-guards'
import {
  fetchStorytellerBible,
  fetchStorytellerEpisode,
  fetchStorytellerPlan,
  fetchStorytellerTimeline,
  patchBeat,
  patchStorytellerEpisode,
  saveStorytellerBible,
  saveStorytellerPlan,
} from '@/domains/storyteller/core/io/storyteller.api'
import {
  fetchStorytellerCharacter,
  patchStorytellerCharacter,
} from '@/domains/storyteller/core/io/character.api'
import { set } from 'lodash'
import { CascadeElementType } from '@/domains/storyteller/core/constants/cascade-editor'

const EPISODE_ID_REQUIRED_BEATS = 'Episode ID required for beat updates'
const EPISODE_ID_REQUIRED_PREMISE = 'Episode ID required for premise updates'

/**
 * Apply cascading fixes to story elements
 */
export async function applyCascadingFixes(
  fixes: ConsistencyFix[],
  projectId: string,
  episodeId?: string
): Promise<CascadeResult> {
  const results: AppliedFix[] = []
  const errors: string[] = []

  for (const fix of fixes) {
    try {
      await applyFix(fix, projectId, episodeId)
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

async function applyFix(fix: ConsistencyFix, projectId: string, episodeId?: string): Promise<void> {
  const { targetElement, changes } = fix

  switch (targetElement.type) {
    case CascadeElementType.Character:
      await updateCharacter(targetElement.id, changes, projectId)
      break

    case CascadeElementType.Beat:
      await updateBeat(targetElement.id, changes, projectId, episodeId)
      break

    case CascadeElementType.Episode:
      await updateEpisode(targetElement.id, changes, projectId)
      break

    case CascadeElementType.WorldRule:
      await updateWorldRules(changes, projectId)
      break

    case CascadeElementType.Premise:
      await updatePremise(changes, projectId, episodeId)
      break

    default:
      throw new Error(`Unknown element type: ${targetElement.type}`)
  }
}

async function updateCharacter(
  characterId: string,
  changes: ConsistencyChange[],
  _projectId: string
): Promise<void> {
  const character = await fetchStorytellerCharacter(characterId)
  const updated = applyChangesToObject(character, changes)
  await patchStorytellerCharacter(characterId, updated)
}

async function updateBeat(
  beatId: string,
  changes: ConsistencyChange[],
  _projectId: string,
  episodeId?: string
): Promise<void> {
  if (!episodeId) throw new Error(EPISODE_ID_REQUIRED_BEATS)

  const timeline = await fetchStorytellerTimeline(episodeId)
  const beats = recordArrayFromJson(timeline.beats)
  const beat = beats.find(row => readString(recordFromJson(row).id) === beatId)

  if (!beat) throw new Error(`Beat ${beatId} not found`)

  const updated = applyChangesToObject(recordFromJson(beat), changes)
  await patchBeat(beatId, updated)
}

async function updateEpisode(
  episodeId: string,
  changes: ConsistencyChange[],
  _projectId: string
): Promise<void> {
  const episode = await fetchStorytellerEpisode(episodeId)
  const updated = applyChangesToObject(recordFromJson(episode), changes)
  await patchStorytellerEpisode(episodeId, updated)
}

async function updateWorldRules(changes: ConsistencyChange[], projectId: string): Promise<void> {
  const response = await fetchStorytellerBible(projectId)
  const bible = recordFromJson(response.bible ?? response.seriesBible ?? response)
  const updated = applyChangesToObject(bible, changes)
  await saveStorytellerBible({ projectId, bible: updated })
}

async function updatePremise(
  changes: ConsistencyChange[],
  _projectId: string,
  episodeId?: string
): Promise<void> {
  if (!episodeId) throw new Error(EPISODE_ID_REQUIRED_PREMISE)

  const plan = await fetchStorytellerPlan(episodeId)
  const updated = applyChangesToObject(plan, changes)
  await saveStorytellerPlan({ episodeId, ...updated })
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
  projectId: string,
  episodeId?: string
): Promise<void> {
  const reverseChanges = fix.changes.map(change => ({
    ...change,
    after: change.before,
    before: change.after,
  }))

  await applyFix({ ...fix, changes: reverseChanges }, projectId, episodeId)
}
