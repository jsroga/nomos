import { stringArrayFromJson } from '@/shared/data/json-guards'
import { DB_COLUMN } from '@/shared/data/constants/db-tables'
import { clampStyleReferenceUrls, StyleRefProjectPatch } from './style-ref-files'

export enum StyleRefOwner {
  Canvas = 'canvas',
  Storyteller = 'storyteller',
}

export function styleRefPatchKey(owner: StyleRefOwner): StyleRefProjectPatch {
  return owner === StyleRefOwner.Storyteller
    ? StyleRefProjectPatch.StorytellerStyleReferenceUrls
    : StyleRefProjectPatch.StyleReferenceUrls
}

export function styleRefColumn(owner: StyleRefOwner): string {
  return owner === StyleRefOwner.Storyteller
    ? DB_COLUMN.STORYTELLER_STYLE_REFERENCE_URLS
    : DB_COLUMN.STYLE_REFERENCE_URLS
}

export function styleRefUrlsFromProject(
  project: {
    styleReferenceUrls?: string[] | null
    storytellerStyleReferenceUrls?: string[] | null
  } | null,
  owner: StyleRefOwner,
): string[] {
  if (!project) return []
  const urls =
    owner === StyleRefOwner.Storyteller
      ? project.storytellerStyleReferenceUrls
      : project.styleReferenceUrls
  return clampStyleReferenceUrls(urls ?? [])
}

export function styleRefUrlsFromRecord(
  record: Record<string, unknown>,
  owner: StyleRefOwner,
): string[] {
  return clampStyleReferenceUrls(
    stringArrayFromJson(record[styleRefPatchKey(owner)] ?? record[styleRefColumn(owner)]),
  )
}
