import { describe, expect, it, vi } from 'vitest'
import {
  descriptionForNewReference,
  fillMissingEntityDescriptions,
} from '../entity-base-description-service'
import {
  entityNeedsDescription,
  fallbackEntityDescription,
  hasUsefulResolveContext,
} from '../constants/entity-base-description'
import { EntityRegistryNote } from '@/domains/storyteller/services/constants/entity-registry-log'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'

function entity(overrides: Partial<EntityReference> & Pick<EntityReference, 'id' | 'description'>): EntityReference {
  return {
    type: StoryEntityType.Character,
    name: 'Marcus',
    metadata: {},
    projectId: 'proj-1',
    createdAt: new Date('2026-01-01'),
    lastReferencedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

describe('entityNeedsDescription', () => {
  it('treats empty and whitespace as missing', () => {
    expect(entityNeedsDescription('')).toBe(true)
    expect(entityNeedsDescription('   ')).toBe(true)
    expect(entityNeedsDescription('A Warden of the ledger.')).toBe(false)
  })

  it('treats Auto-registered notes and name-only text as missing', () => {
    expect(entityNeedsDescription(`${EntityRegistryNote.AutoRegistered} place from world text`)).toBe(
      true
    )
    expect(entityNeedsDescription('Marcus', 'Marcus')).toBe(true)
    expect(entityNeedsDescription('Marcus', 'Sera')).toBe(false)
  })
})

describe('hasUsefulResolveContext', () => {
  it('skips contextual summaries when surrounding text is short', () => {
    expect(hasUsefulResolveContext('short')).toBe(false)
    expect(hasUsefulResolveContext(null)).toBe(false)
  })

  it('allows contextual summaries when surrounding text is long enough', () => {
    expect(hasUsefulResolveContext('Marcus finds the ledger in the ward.')).toBe(true)
  })
})

describe('descriptionForNewReference', () => {
  it('keeps a provided description', async () => {
    await expect(
      descriptionForNewReference('Already written.', {
        name: 'Marcus',
        type: StoryEntityType.Character,
        projectId: 'proj-1',
      })
    ).resolves.toBe('Already written.')
  })
})

describe('fillMissingEntityDescriptions', () => {
  it('generates and persists only for entities without a description', async () => {
    const generate = vi.fn(async () => 'Warden of the silent ledger.')
    const persist = vi.fn(async () => undefined)
    const rows = [
      entity({ id: 'char-marcus', description: '' }),
      entity({ id: 'char-sera', name: 'Sera', description: 'Already known.' }),
    ]

    const filled = await fillMissingEntityDescriptions(rows, 'Marcus finds the ledger.', generate, persist)

    expect(generate).toHaveBeenCalledOnce()
    expect(persist).toHaveBeenCalledWith('char-marcus', 'Warden of the silent ledger.')
    expect(filled[0]?.description).toBe('Warden of the silent ledger.')
    expect(filled[1]?.description).toBe('Already known.')
  })

  it('generates when the stored description is only the entity name', async () => {
    const generate = vi.fn(async () => 'Warden of the silent ledger.')
    const persist = vi.fn(async () => undefined)
    const rows = [entity({ id: 'char-marcus', name: 'Marcus', description: 'Marcus' })]

    const filled = await fillMissingEntityDescriptions(rows, '', generate, persist)

    expect(generate).toHaveBeenCalledOnce()
    expect(filled[0]?.description).toBe('Warden of the silent ledger.')
  })

  it('fills every entity that is missing a description', async () => {
    const generate = vi.fn(async ({ name }: { name: string }) => `${name} is in the ward.`)
    const persist = vi.fn(async () => undefined)
    const rows = Array.from({ length: 12 }, (_, index) =>
      entity({ id: `char-${index}`, name: `Char ${index}`, description: '' })
    )

    const filled = await fillMissingEntityDescriptions(rows, '', generate, persist)

    expect(generate).toHaveBeenCalledTimes(12)
    expect(filled.every(row => row.description.includes('is in the ward'))).toBe(true)
  })

  it('still returns generated text when persist fails', async () => {
    const generate = vi.fn(async () => 'Warden of the silent ledger.')
    const persist = vi.fn(async () => {
      throw new Error('db down')
    })
    const rows = [entity({ id: 'char-marcus', description: '' })]

    const filled = await fillMissingEntityDescriptions(rows, '', generate, persist)

    expect(filled[0]?.description).toBe('Warden of the silent ledger.')
  })
})

describe('fallbackEntityDescription', () => {
  it('names the entity and type', () => {
    expect(fallbackEntityDescription('Marcus', StoryEntityType.Character)).toBe('Marcus (character)')
  })
})
