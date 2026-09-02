import fs from 'fs'
import { logger } from '@trigger.dev/sdk'
import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import { ImageFileExtension, UrlScheme } from '@/shared/data/constants/protocol'
import { readString, recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import { storytellerCharacterFromRow } from '@/domains/storyteller/core/entities/character-wire'
import type {
  BeatCastMember,
  BeatExtractTextFields,
} from '@/domains/storyteller/services/constants/beat-cast-extract'
import { beatImageDiskPath } from './compose-storyboard-contact-sheet'
import {
  STORYBOARD_BEAT_SELECT,
  STORYBOARD_CAST_SELECT,
  StoryboardBeatColumn,
  StoryboardBeatLog,
  StoryboardBeatTable,
  StoryboardPortraitRefFilename,
} from './constants/storyboard-beat-generation'
import {
  partitionBeatCastRefs,
  type StoryboardCastRefs,
} from './constants/storyboard-beat-prompt'
import { isPublicHttpsUrl, persistGeneratedImage } from './persist-generated-image'

export interface StoryboardBeatCastLoad {
  fields: BeatExtractTextFields
  hintedNames: string[]
  roster: BeatCastMember[]
}

function isRemoteUrl(url: string): boolean {
  return (
    url.startsWith(`${UrlScheme.Https}://`) || url.startsWith(`${UrlScheme.Http}://`)
  )
}

function rosterFromRows(rows: unknown): BeatCastMember[] {
  if (!Array.isArray(rows)) return []
  const members: BeatCastMember[] = []
  for (const row of rows) {
    const character = storytellerCharacterFromRow(row)
    if (!character) continue
    members.push({
      id: character.id,
      name: character.name,
      ...(character.portraitUrl ? { portraitUrl: character.portraitUrl } : {}),
    })
  }
  return members
}

async function portraitBytes(
  projectId: string,
  portraitUrl: string,
): Promise<Buffer | undefined> {
  try {
    if (isRemoteUrl(portraitUrl)) {
      const response = await fetch(portraitUrl)
      if (!response.ok) return undefined
      return Buffer.from(await response.arrayBuffer())
    }
    const diskPath = beatImageDiskPath(projectId, portraitUrl)
    if (!fs.existsSync(diskPath)) return undefined
    return fs.readFileSync(diskPath)
  } catch {
    return undefined
  }
}

export async function toPublicPortraitUrl(
  projectId: string,
  characterId: string,
  portraitUrl: string | undefined,
): Promise<string | undefined> {
  const trimmed = portraitUrl?.trim()
  if (!trimmed) return undefined
  if (isPublicHttpsUrl(trimmed)) return trimmed
  const bytes = await portraitBytes(projectId, trimmed)
  if (!bytes) return undefined
  const persisted = await persistGeneratedImage({
    projectId,
    filename: `${StoryboardPortraitRefFilename.Prefix}${characterId}${ImageFileExtension.Png}`,
    bytes,
  })
  return isPublicHttpsUrl(persisted) ? persisted : undefined
}

export async function resolveBeatCastRefs(
  projectId: string,
  members: readonly BeatCastMember[],
): Promise<StoryboardCastRefs> {
  const urlsById: Record<string, string> = {}
  for (const member of members) {
    try {
      const url = await toPublicPortraitUrl(projectId, member.id, member.portraitUrl)
      if (url) urlsById[member.id] = url
    } catch {
      continue
    }
  }
  return partitionBeatCastRefs(members, urlsById)
}

export async function loadStoryboardBeatCast(
  beatId: string,
  projectId: string,
): Promise<StoryboardBeatCastLoad> {
  const empty: StoryboardBeatCastLoad = { fields: {}, hintedNames: [], roster: [] }
  try {
    const supabase = createSupabaseServiceClient()
    const [beatResult, castResult] = await Promise.all([
      supabase
        .from(StoryboardBeatTable.Beats)
        .select(STORYBOARD_BEAT_SELECT)
        .eq(StoryboardBeatColumn.Id, beatId)
        .maybeSingle(),
      supabase
        .from(StoryboardBeatTable.Characters)
        .select(STORYBOARD_CAST_SELECT)
        .eq(StoryboardBeatColumn.ProjectId, projectId),
    ])
    const beat = recordFromJson(beatResult.data)
    return {
      fields: {
        logline: readString(beat[StoryboardBeatColumn.Logline]),
        visualHook: readString(beat[StoryboardBeatColumn.VisualHook]),
        content: readString(beat[StoryboardBeatColumn.Content]),
        imagePrompt: readString(beat[StoryboardBeatColumn.ImagePrompt]),
      },
      hintedNames: stringArrayFromJson(beat[StoryboardBeatColumn.CharactersInvolved]),
      roster: rosterFromRows(castResult.data),
    }
  } catch (error) {
    logger.warn(StoryboardBeatLog.CastLoadFailed, { beatId, projectId, error })
    return empty
  }
}

export function beatCastExtractFields(
  loaded: StoryboardBeatCastLoad,
  scenePrompt: string,
): BeatExtractTextFields {
  return { ...loaded.fields, scenePrompt }
}
