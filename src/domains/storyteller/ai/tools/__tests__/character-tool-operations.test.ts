import { describe, expect, it } from 'vitest'
import { buildCharacterInsertValues } from '../character-tool-operations'

enum InsertFixture {
  ProjectId = '28c216c8-c506-4312-ad08-8755141f985c',
  Name = 'Vex',
}

describe('buildCharacterInsertValues', () => {
  it('inserts empty psychology object instead of null', () => {
    const values = buildCharacterInsertValues(InsertFixture.ProjectId, { name: InsertFixture.Name })
    expect(values.psychology).toEqual({})
    expect(values.voice).toEqual({})
  })
})
