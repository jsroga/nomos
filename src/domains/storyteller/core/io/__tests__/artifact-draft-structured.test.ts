import { describe, expect, it } from 'vitest'
import { ArtifactKind } from '@/domains/storyteller/core/types/artifact-kind'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import {
  serializeArtifactDraftItems,
  serializeArtifactDraftJson,
  serializeArtifactDraftProse,
  specForArtifactDraft,
} from '../artifact-draft-structured'

const WORLD = 'A salt-flat city under a white sun.'

describe('artifact draft structured serialize', () => {
  it('serializes world description as prose', () => {
    expect(serializeArtifactDraftProse({ description: WORLD })).toBe(WORLD)
    const spec = specForArtifactDraft(ArtifactKind.BibleSection, BibleSection.WORLD_DESCRIPTION)
    expect(spec.serialize({ description: WORLD })).toBe(WORLD)
  })

  it('serializes named lists from the items wrapper', () => {
    const items = [{ name: 'Ash Choir', description: 'They sing the tide in.' }]
    expect(serializeArtifactDraftItems({ items })).toBe(JSON.stringify(items))
    const spec = specForArtifactDraft(ArtifactKind.BibleSection, BibleSection.FACTIONS)
    expect(spec.serialize({ items })).toBe(JSON.stringify(items))
  })

  it('serializes character and premise as JSON objects', () => {
    const character = { name: 'Vera', description: 'Keeps the ledger.' }
    expect(serializeArtifactDraftJson(character)).toBe(JSON.stringify(character))
    expect(specForArtifactDraft(ArtifactKind.Character).serialize(character)).toBe(
      JSON.stringify(character)
    )
    const premise = { logline: 'A clerk forges her own death certificate.' }
    expect(specForArtifactDraft(ArtifactKind.EpisodePremise).serialize(premise)).toBe(
      JSON.stringify(premise)
    )
  })
})
