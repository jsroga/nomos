import { describe, it, expect } from 'vitest'
import {
  mapToolResultToAction,
  detectLoadingSection,
  getActionDedupeKey,
} from '../tool-result-mapper'
import { ActionType, BibleSection } from '@/domains/storyteller/core/types/Enums'

describe('detectLoadingSection', () => {
  it('returns null for non-update tools', () => {
    expect(detectLoadingSection('manage_beat', { worldRules: [] })).toBeNull()
  })

  it('detects a section key in update_world_bible args', () => {
    expect(detectLoadingSection('update_world_bible', { worldRules: [] })).toBe('worldRules')
  })

  it('normalizes characters/cast to keyCharacters', () => {
    expect(detectLoadingSection('update_world_bible', { cast: [] })).toBe('keyCharacters')
    expect(detectLoadingSection('update_world_bible', { characters: [] })).toBe('keyCharacters')
  })

  it('maps individual premise fields to episodePremise', () => {
    expect(detectLoadingSection('consult_premise_architect', { fatalFlaw: 'x' })).toBe(
      'episodePremise'
    )
  })

  it('prefers explicit section arg', () => {
    expect(detectLoadingSection('update_world_bible', { section: 'factions' })).toBe('factions')
  })
})

describe('getActionDedupeKey', () => {
  it('keys beats by id', () => {
    expect(getActionDedupeKey('manage_beat', 'beats', { id: 'b1' })).toBe('manage_beat:b1')
  })

  it('keys beats by title when no id', () => {
    expect(getActionDedupeKey('manage_beat', 'beats', { title: 'Opening' })).toBe(
      'manage_beat:Opening'
    )
  })

  it('keys world bible by section + content preview', () => {
    const key = getActionDedupeKey('update_world_bible', 'worldRules', { worldRules: [1] })
    expect(key.startsWith('update_world_bible:worldRules:')).toBe(true)
  })

  it('keys other tools by sorted payload keys', () => {
    expect(getActionDedupeKey('create_character', 'full', { name: 'A', role: 'B' })).toBe(
      'create_character:full:name,role'
    )
  })
})

describe('mapToolResultToAction', () => {
  const base = { episodeId: 'ep1', isSectionUpdate: false, currentSection: BibleSection.FULL }

  it('maps ask_character_questions to questions', () => {
    const out = mapToolResultToAction({
      ...base,
      toolName: 'ask_character_questions',
      parsed: {
        type: 'questions',
        characterName: 'Ada',
        questions: [{ id: 'q1', question: 'Why?', options: ['a'] }],
      },
    })
    expect(out.kind).toBe('questions')
    if (out.kind === 'questions') expect(out.questions).toHaveLength(1)
  })

  it('maps create_episode to info', () => {
    const out = mapToolResultToAction({
      ...base,
      toolName: 'create_episode',
      parsed: { success: true, episode: { title: 'Pilot' } },
    })
    expect(out.kind).toBe('info')
  })

  it('maps start_beat_planning to navigation', () => {
    const out = mapToolResultToAction({
      ...base,
      toolName: 'start_beat_planning',
      parsed: { success: true, type: 'navigation', action: 'open', episodeId: 'ep1' },
    })
    expect(out.kind).toBe('navigation')
  })

  it('maps consult_premise_architect to an approval action', () => {
    const out = mapToolResultToAction({
      ...base,
      toolName: 'consult_premise_architect',
      parsed: { episodePremise: { logline: 'x' } },
    })
    expect(out.kind).toBe('action')
    if (out.kind === 'action') {
      expect(out.actionType).toBe('UPDATE_EPISODE_PREMISE')
      expect(out.requiresApproval).toBe(true)
    }
  })

  it('maps manage_beat created to CREATE_BEAT with beats section', () => {
    const out = mapToolResultToAction({
      ...base,
      toolName: 'manage_beat',
      parsed: { success: true, message: 'Beat created', beat: { id: 'b1' } },
    })
    expect(out.kind).toBe('action')
    if (out.kind === 'action') {
      expect(out.actionType).toBe(ActionType.CREATE_BEAT)
      expect(out.detectedSection).toBe('beats')
    }
  })

  it('maps update_story_phase', () => {
    const out = mapToolResultToAction({
      ...base,
      toolName: 'update_story_phase',
      parsed: { success: true, phase: 'breaking' },
    })
    expect(out.kind).toBe('action')
    if (out.kind === 'action') {
      expect(out.actionType).toBe(ActionType.UPDATE_STORY_PHASE)
      expect(out.actionPayload).toEqual({ phase: 'breaking' })
    }
  })

  it('maps create_character as immediate (no approval)', () => {
    const out = mapToolResultToAction({
      ...base,
      toolName: 'create_character',
      parsed: { success: true, character: { name: 'Ada' } },
    })
    expect(out.kind).toBe('action')
    if (out.kind === 'action') {
      expect(out.actionType).toBe(ActionType.CREATE_CHARACTER)
      expect(out.requiresApproval).toBe(false)
    }
  })

  it('returns none for unrecognized / unsuccessful results', () => {
    expect(mapToolResultToAction({ ...base, toolName: 'whatever', parsed: { success: false } }).kind).toBe(
      'none'
    )
  })
})
