import { describe, expect, it } from 'vitest'
import { stPatchProjectRequest } from '@/domains/storyteller/core/io/openapi-schemas'
import { projectPatchRequestSchema } from '@/domains/storyteller/core/io/project-patch'

describe('project PATCH schema', () => {
  it('is the OpenAPI body schema', () => {
    expect(stPatchProjectRequest).toBe(stPatchProjectRequest)
    expect(projectPatchRequestSchema.safeParse({ name: 'x' }).success).toBe(true)
  })

  it('strips userId and accepts bible aliases', () => {
    const parsed = projectPatchRequestSchema.parse({
      name: 'Harbour',
      userId: 'forged',
      series_bible: { tone: 'cold' },
    })
    expect(parsed).toEqual({ name: 'Harbour', series_bible: { tone: 'cold' } })
  })

  it('rejects a non-string name', () => {
    expect(projectPatchRequestSchema.safeParse({ name: 3 }).success).toBe(false)
  })
})
