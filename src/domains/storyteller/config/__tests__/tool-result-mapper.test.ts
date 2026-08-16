/**
 * Pin-down tests for the tool-result → UI action mapping.
 *
 * These lock the SURVIVING mappings byte-for-byte before the phantom-tool
 * branches (update_story_phase, create_character, …) are deleted — the smoke
 * e2e depends on the `action` frames these produce.
 */

import { describe, expect, it } from 'vitest'
import {
  detectLoadingSection,
  getActionDedupeKey,
  mapToolResultToAction,
} from '../tool-result-mapper'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/enums'

describe('detectLoadingSection', () => {
  it('detects a bible section from update_world_bible args', () => {
    expect(detectLoadingSection('update_world_bible', { worldRules: [] })).toBe('worldRules')
  })

  it('maps individual premise fields to the episodePremise panel', () => {
    expect(detectLoadingSection('update_world_bible', { fatalFlaw: 'x' })).toBe('episodePremise')
  })

  it('normalizes cast/characters to keyCharacters', () => {
    expect(detectLoadingSection('update_world_bible', { cast: [] })).toBe('keyCharacters')
  })

  it('returns null for non-bible tools', () => {
    expect(detectLoadingSection('manage_beat', { logline: 'x' })).toBeNull()
  })

  it('maps manage_episode premise writes to the episodePremise panel', () => {
    expect(
      detectLoadingSection('manage_episode', {
        operation: 'update',
        data: { title: 'Pilot', premise: { logline: 'x' } },
      }),
    ).toBe('episodePremise')
  })
})

describe('getActionDedupeKey', () => {
  it('keys manage_beat actions by beat id', () => {
    expect(getActionDedupeKey('manage_beat', 'beats', { beat: { id: 'b1' } })).toBe(
      'manage_beat:b1'
    )
  })

  it('falls back to beat title when no id exists', () => {
    expect(getActionDedupeKey('manage_beat', 'beats', { title: 'Opening' })).toBe(
      'manage_beat:Opening'
    )
  })

  it('keys update_world_bible by section + content preview', () => {
    const key = getActionDedupeKey('update_world_bible', 'worldRules', { worldRules: ['r1'] })
    expect(key.startsWith('update_world_bible:worldRules:')).toBe(true)
  })
})

describe('mapToolResultToAction — surviving mappings', () => {
  it('update_world_bible with the real tool output shape (updatedFields: string[]) maps to the generic bible action', () => {
    const outcome = mapToolResultToAction({
      toolName: 'update_world_bible',
      parsed: { success: true, updatedFields: ['worldRules'] },
      episodeId: 'ep-1',
      isSectionUpdate: false,
      currentSection: BibleSection.FULL,
    })
    expect(outcome).toEqual({
      kind: 'action',
      actionType: ActionType.UPDATE_SERIES_BIBLE,
      actionPayload: { updatedFields: ['worldRules'] },
      requiresApproval: true,
      detectedSection: BibleSection.FULL,
    })
  })

  it('manage_beat create maps to CREATE_BEAT with approval', () => {
    const beat = { id: 'b1', logline: 'x' }
    const outcome = mapToolResultToAction({
      toolName: 'manage_beat',
      parsed: { success: true, message: 'Beat created successfully', beat },
      episodeId: 'ep-1',
      isSectionUpdate: false,
      currentSection: BibleSection.FULL,
    })
    expect(outcome).toEqual({
      kind: 'action',
      actionType: ActionType.CREATE_BEAT,
      actionPayload: beat,
      requiresApproval: true,
      detectedSection: 'beats',
    })
  })

  it('manage_beat delete maps to DELETE_BEAT without approval', () => {
    const outcome = mapToolResultToAction({
      toolName: 'manage_beat',
      parsed: { success: true, message: 'Beat deleted', beat: { id: 'b1' }, deletedId: 'b1' },
      episodeId: 'ep-1',
      isSectionUpdate: false,
      currentSection: BibleSection.FULL,
    })
    expect(outcome).toEqual({
      kind: 'action',
      actionType: ActionType.DELETE_BEAT,
      actionPayload: { beatId: 'b1' },
      requiresApproval: false,
      detectedSection: 'beats',
    })
  })

  it('unsuccessful results map to none', () => {
    const outcome = mapToolResultToAction({
      toolName: 'update_world_bible',
      parsed: { success: false, error: 'nope' },
      episodeId: null,
      isSectionUpdate: false,
      currentSection: BibleSection.FULL,
    })
    expect(outcome).toEqual({ kind: 'none' })
  })

  it('unknown tools map to none', () => {
    const outcome = mapToolResultToAction({
      toolName: 'list_beats',
      parsed: { success: true, beats: [] },
      episodeId: null,
      isSectionUpdate: false,
      currentSection: BibleSection.FULL,
    })
    expect(outcome).toEqual({ kind: 'none' })
  })
})
