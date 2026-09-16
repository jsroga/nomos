import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

describe('cascade apply writes through the database', () => {
  it('does not fetch relative /api/storyteller/characters paths', () => {
    const source = readFileSync(
      'src/domains/storyteller/services/apply-cascading-fixes.ts',
      'utf8'
    )
    expect(source).toContain('buildCharacterPatchUpdates')
    expect(source).toContain('persistStoryPlanUpdates')
    expect(source).toContain('ProjectScope')
    expect(source).not.toContain('fetchStorytellerCharacter')
    expect(source).not.toContain('patchStorytellerCharacter')
  })
})
