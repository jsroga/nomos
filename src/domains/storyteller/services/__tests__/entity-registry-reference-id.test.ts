import { describe, expect, it } from 'vitest'
import { displayNameFromRefId } from '../entity-registry-reference-id'

describe('displayNameFromRefId', () => {
  it('title-cases the slug after the type prefix', () => {
    expect(displayNameFromRefId('place-the-old-ward')).toBe('The Old Ward')
    expect(displayNameFromRefId('item-ledger-key')).toBe('Ledger Key')
  })
})
