import { describe, expect, it } from 'vitest'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import {
  ReferenceTextMetaLabel,
  ReferenceTextTooltipCopy,
} from '../../constants/reference-text-display'
import {
  buildDisplayMeta,
  synthesizeEntityDescription,
  tooltipMetaFrom,
} from '../entity-tooltip-meta'

function entity(
  overrides: Partial<EntityReference> & Pick<EntityReference, 'id' | 'type'>
): EntityReference {
  return {
    name: 'Marcus',
    description: '',
    metadata: {},
    projectId: 'proj-1',
    createdAt: new Date('2026-01-01'),
    lastReferencedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('tooltipMetaFrom', () => {
  it('returns empty meta when metadata is not an object', () => {
    // Arrange
    const metadata = 'not-an-object'

    // Act
    const meta = tooltipMetaFrom(metadata)

    // Assert
    expect(meta).toEqual({})
  })

  it('drops non-string role values instead of throwing', () => {
    // Arrange
    const metadata = { role: 12, motivation: 'Keep the ledger' }

    // Act
    const meta = tooltipMetaFrom(metadata)

    // Assert
    expect(meta.role).toBeUndefined()
    expect(meta.motivation).toBe('Keep the ledger')
  })
})

describe('synthesizeEntityDescription', () => {
  it('ignores whitespace-only stored descriptions and falls back to metadata', () => {
    // Arrange
    const row = entity({
      id: 'char-marcus',
      type: StoryEntityType.Character,
      description: '   ',
      metadata: { role: 'Warden' },
    })

    // Act
    const description = synthesizeEntityDescription(row)

    // Assert
    expect(description).toContain('Warden')
  })

  it('returns null for an item with empty description and empty metadata', () => {
    // Arrange
    const row = entity({
      id: 'item-ledger-key',
      type: StoryEntityType.Item,
      name: 'Ledger Key',
      description: '',
    })

    // Act
    const description = synthesizeEntityDescription(row)

    // Assert
    expect(description).toBeNull()
  })

  it('synthesizes an item from metadata when the registry description is missing', () => {
    // Arrange
    const row = entity({
      id: 'item-ledger-key',
      type: StoryEntityType.Item,
      name: 'Ledger Key',
      metadata: { description: 'Opens the silent vault.', significance: 'Plot lock' },
    })

    // Act
    const description = synthesizeEntityDescription(row)

    // Assert
    expect(description).toContain('Opens the silent vault.')
  })

  it('does not invent a character description from an empty metadata object', () => {
    // Arrange
    const row = entity({
      id: 'char-unknown',
      type: StoryEntityType.Character,
      metadata: {},
    })

    // Act
    const description = synthesizeEntityDescription(row)

    // Assert
    expect(description).toBeNull()
  })

  it('caps synthesized parts so a noisy faction does not dump every field', () => {
    // Arrange
    const row = entity({
      id: 'faction-guild',
      type: StoryEntityType.Faction,
      name: 'The Guild',
      metadata: {
        description: 'Runs the docks.',
        powerStructure: 'Council',
        politicalForces: 'Harbor votes',
        goals: ['Expand', 'Survive', 'Dominate'],
        resources: 'Ships',
      },
    })

    // Act
    const description = synthesizeEntityDescription(row)

    // Assert
    expect(description?.split('. ').length).toBeLessThanOrEqual(3)
    expect(description).toContain('Runs the docks.')
  })
})

describe('buildDisplayMeta', () => {
  it('omits role when it is already inside the description', () => {
    // Arrange
    const row = entity({
      id: 'char-marcus',
      type: StoryEntityType.Character,
      metadata: { role: 'Warden', motivation: 'Protect the ledger' },
    })
    const description = 'Warden of the silent ward.'

    // Act
    const items = buildDisplayMeta(row, description)

    // Assert
    expect(items.some(item => item.label === ReferenceTextMetaLabel.Role)).toBe(false)
    expect(items.some(item => item.label === ReferenceTextMetaLabel.Motivation)).toBe(true)
  })

  it('returns no extra rows when metadata is malformed', () => {
    // Arrange
    const row = entity({
      id: 'char-marcus',
      type: StoryEntityType.Character,
      metadata: { traits: 'not-an-array', goals: 1 },
    })

    // Act
    const items = buildDisplayMeta(row, null)

    // Assert
    expect(items).toEqual([])
  })

  it('does not surface archetype prefix as a duplicate meta row for non-characters', () => {
    // Arrange
    const row = entity({
      id: 'place-ward',
      type: StoryEntityType.Place,
      metadata: { role: 'Should be ignored', atmosphere: 'Fog' },
    })

    // Act
    const items = buildDisplayMeta(row, null)

    // Assert
    expect(items).toEqual([])
    expect(ReferenceTextTooltipCopy.ArchetypePrefix).toBeTruthy()
  })
})
