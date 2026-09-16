import { describe, expect, it } from 'vitest'
import { ManageToolOperation } from '../manage-tools-wire'
import { ManageCharacterInputSchema } from '../character-tools-schema'

enum SchemaFixture {
  TruncatedProjectId = 'a5791cfd-6f96-4301-b147-0e33d54caa',
  ValidProjectId = 'a5791cfd-6f96-4301-b147-0e33d54caa2a',
  CharacterName = 'Vex',
}

describe('ManageCharacterInputSchema', () => {
  it('drops a truncated projectId so workspace injection can supply it', () => {
    const parsed = ManageCharacterInputSchema.safeParse({
      operation: ManageToolOperation.Create,
      projectId: SchemaFixture.TruncatedProjectId,
      data: { name: SchemaFixture.CharacterName },
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.projectId).toBeUndefined()
    expect(parsed.data.data?.name).toBe(SchemaFixture.CharacterName)
  })

  it('keeps a valid projectId', () => {
    const parsed = ManageCharacterInputSchema.safeParse({
      operation: ManageToolOperation.Create,
      projectId: SchemaFixture.ValidProjectId,
      data: { name: SchemaFixture.CharacterName },
    })
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.projectId).toBe(SchemaFixture.ValidProjectId)
  })
})
