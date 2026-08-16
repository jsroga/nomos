import { describe, expect, it } from 'vitest'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import type { EntityReference } from '@/domains/storyteller/core/entities/entity-references'
import {
  shouldRefetchEntityForTooltip,
  shouldShowEntityTooltipLoading,
} from '../should-show-entity-tooltip-loading'

function entity(description: string): EntityReference {
  return {
    id: 'char-marcus',
    type: StoryEntityType.Character,
    name: 'Marcus',
    description,
    metadata: {},
    projectId: 'proj-1',
    createdAt: new Date('2026-01-01'),
    lastReferencedAt: new Date('2026-01-01'),
  }
}

describe('shouldRefetchEntityForTooltip', () => {
  it('refetches unresolved chips and name-only descriptions', () => {
    expect(shouldRefetchEntityForTooltip(null)).toBe(true)
    expect(shouldRefetchEntityForTooltip(entity(''))).toBe(true)
    expect(shouldRefetchEntityForTooltip(entity('Marcus'))).toBe(true)
  })

  it('does not refetch when a real description already exists', () => {
    expect(shouldRefetchEntityForTooltip(entity('Warden of the silent ledger.'))).toBe(false)
  })
})

describe('shouldShowEntityTooltipLoading', () => {
  it('shows loading until the first result arrives', () => {
    expect(shouldShowEntityTooltipLoading(true, true, null)).toBe(true)
  })

  it('does not treat a disabled query as loading', () => {
    expect(shouldShowEntityTooltipLoading(true, false, null)).toBe(false)
  })

  it('shows loading while a missing description is being generated', () => {
    expect(shouldShowEntityTooltipLoading(false, true, entity(''))).toBe(true)
    expect(shouldShowEntityTooltipLoading(false, true, entity('Marcus'))).toBe(true)
  })

  it('does not flash loading on a refetch of an already described entity', () => {
    expect(
      shouldShowEntityTooltipLoading(false, true, entity('Warden of the silent ledger.'))
    ).toBe(false)
  })
})
