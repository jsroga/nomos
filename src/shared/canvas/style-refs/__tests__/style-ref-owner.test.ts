import { describe, expect, it } from 'vitest'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { StyleRefProjectPatch } from '../style-ref-files'
import {
  StyleRefOwner,
  styleRefColumn,
  styleRefPatchKey,
  styleRefUrlsFromProject,
  styleRefUrlsFromRecord,
} from '../style-ref-owner'

const CANVAS = 'https://cdn.example/canvas.png'
const STORY = 'https://cdn.example/story.png'

describe('styleRefOwner', () => {
  it.each([
    {
      owner: StyleRefOwner.Canvas,
      patch: StyleRefProjectPatch.StyleReferenceUrls,
      column: DB_COLUMN.STYLE_REFERENCE_URLS,
    },
    {
      owner: StyleRefOwner.Storyteller,
      patch: StyleRefProjectPatch.StorytellerStyleReferenceUrls,
      column: DB_COLUMN.STORYTELLER_STYLE_REFERENCE_URLS,
    },
  ])('$owner patches $column', ({ owner, patch, column }) => {
    expect(styleRefPatchKey(owner)).toBe(patch)
    expect(styleRefColumn(owner)).toBe(column)
  })

  it('reads canvas urls without using the storyteller list', () => {
    const project = {
      styleReferenceUrls: [CANVAS],
      storytellerStyleReferenceUrls: [STORY],
    }
    expect(styleRefUrlsFromProject(project, StyleRefOwner.Canvas)).toEqual([CANVAS])
    expect(styleRefUrlsFromProject(project, StyleRefOwner.Storyteller)).toEqual([STORY])
  })

  it('reads camel or snake keys from a GET payload', () => {
    expect(
      styleRefUrlsFromRecord(
        { [DB_COLUMN.STORYTELLER_STYLE_REFERENCE_URLS]: [STORY] },
        StyleRefOwner.Storyteller,
      ),
    ).toEqual([STORY])
    expect(
      styleRefUrlsFromRecord(
        { [StyleRefProjectPatch.StyleReferenceUrls]: [CANVAS] },
        StyleRefOwner.Canvas,
      ),
    ).toEqual([CANVAS])
  })
})
