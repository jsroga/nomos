/**
 * Cascade Editor
 *
 * Applies consistency fixes across multiple story elements.
 * Handles updates to characters, beats, world rules, and episodes.
 */

import { ConsistencyFix, CascadeResult, AppliedFix } from '@/domains/storyteller/core/types/ConsistencyTypes'
import { set } from 'lodash'
import {
  CascadeEditorError,
  CascadeEditorHttpMethod,
  CascadeElementType,
} from '@/domains/storyteller/core/constants/cascade-editor'

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

/**
 * Apply a single fix to a story element
 */
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

/**
 * Update a character with consistency fixes
 */
async function updateCharacter(
  characterId: string,
  changes: any[],
  _projectId: string
): Promise<void> {
  // Fetch current character
  const response = await fetch(`/api/storyteller/characters/${characterId}`)
  if (!response.ok) throw new Error(CascadeEditorError.FailedFetchCharacter)

  const character = await response.json()

  // Apply changes
  const updated = applyChangesToObject(character, changes)

  // Save updated character
  const saveResponse = await fetch(`/api/storyteller/characters/${characterId}`, {
    method: CascadeEditorHttpMethod.Patch,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  })

  if (!saveResponse.ok) throw new Error(CascadeEditorError.FailedSaveCharacter)
}

/**
 * Update a beat with consistency fixes
 */
async function updateBeat(
  beatId: string,
  changes: any[],
  _projectId: string,
  episodeId?: string
): Promise<void> {
  if (!episodeId) throw new Error(CascadeEditorError.EpisodeIdRequiredForBeat)

  // Fetch current beat
  const response = await fetch(`/api/storyteller/timeline?episodeId=${episodeId}`)
  if (!response.ok) throw new Error(CascadeEditorError.FailedFetchBeats)

  const { beats } = await response.json()
  const beat = beats.find((b: any) => b.id === beatId)

  if (!beat) throw new Error(`Beat ${beatId} not found`)

  // Apply changes
  const updated = applyChangesToObject(beat, changes)

  // Save updated beat
  const saveResponse = await fetch(`/api/storyteller/timeline/${beatId}`, {
    method: CascadeEditorHttpMethod.Patch,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  })

  if (!saveResponse.ok) throw new Error(CascadeEditorError.FailedSaveBeat)
}

/**
 * Update an episode with consistency fixes
 */
async function updateEpisode(episodeId: string, changes: any[], _projectId: string): Promise<void> {
  // Fetch current episode
  const response = await fetch(`/api/storyteller/episodes/${episodeId}`)
  if (!response.ok) throw new Error(CascadeEditorError.FailedFetchEpisode)

  const episode = await response.json()

  // Apply changes
  const updated = applyChangesToObject(episode, changes)

  // Save updated episode
  const saveResponse = await fetch(`/api/storyteller/episodes/${episodeId}`, {
    method: CascadeEditorHttpMethod.Patch,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated),
  })

  if (!saveResponse.ok) throw new Error(CascadeEditorError.FailedSaveEpisode)
}

/**
 * Update world rules with consistency fixes
 */
async function updateWorldRules(changes: any[], projectId: string): Promise<void> {
  // Fetch current series bible
  const response = await fetch(`/api/storyteller/bible?projectId=${projectId}`)
  if (!response.ok) throw new Error(CascadeEditorError.FailedFetchSeriesBible)

  const bible = await response.json()

  // Apply changes to world rules
  const updated = applyChangesToObject(bible, changes)

  // Save updated bible
  const saveResponse = await fetch('/api/storyteller/bible', {
    method: CascadeEditorHttpMethod.Put,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ projectId, bible: updated }),
  })

  if (!saveResponse.ok) throw new Error(CascadeEditorError.FailedSaveWorldRules)
}

/**
 * Update episode premise with consistency fixes
 */
async function updatePremise(changes: any[], _projectId: string, episodeId?: string): Promise<void> {
  if (!episodeId) throw new Error(CascadeEditorError.EpisodeIdRequiredForPremise)

  // Fetch current plan
  const response = await fetch(`/api/storyteller/plan?episodeId=${episodeId}`)
  if (!response.ok) throw new Error(CascadeEditorError.FailedFetchPlan)

  const plan = await response.json()

  // Apply changes
  const updated = applyChangesToObject(plan, changes)

  // Save updated plan
  const saveResponse = await fetch('/api/storyteller/plan', {
    method: CascadeEditorHttpMethod.Post,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      episodeId,
      ...updated,
    }),
  })

  if (!saveResponse.ok) throw new Error(CascadeEditorError.FailedSavePremise)
}

/**
 * Apply changes to an object using JSON paths
 */
function applyChangesToObject(obj: any, changes: any[]): any {
  const result = JSON.parse(JSON.stringify(obj)) // Deep clone

  for (const change of changes) {
    const { path, after } = change

    // Use lodash set to handle nested paths
    set(result, path, after)
  }

  return result
}

/**
 * Revert a fix (for undo functionality)
 */
export async function revertFix(
  fix: AppliedFix,
  projectId: string,
  episodeId?: string
): Promise<void> {
  // Create reverse changes (swap before and after)
  const reverseChanges = fix.changes.map(change => ({
    ...change,
    after: change.before,
    before: change.after,
  }))

  // Apply reverse changes
  await applyFix({ ...fix, changes: reverseChanges }, projectId, episodeId)
}
