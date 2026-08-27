import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { characters, episodes, projects, storyPlans } from '@/db'
import { parseSeriesBibleRecord } from '@/domains/storyteller/core/io/project-jsonb'
import {
  resolveRoadmapList,
  resolveRoadmapSlot,
  type RoadmapSlot,
} from '@/domains/storyteller/core/utils/roadmap-slot'
import { StorytellerAnswerSeparator } from '@/domains/storyteller/core/storyteller-page-wire'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import type { ProjectScope } from '@/shared/auth/project-scope'
import {
  BIBLE_CATEGORY_KEYS,
  ContextAssemblyFallback,
} from '@/domains/storyteller/services/constants/context-assembly'
import {
  StoryCanonPackLimit,
  StoryCanonPsychologyField,
} from '@/domains/storyteller/services/constants/story-canon-pack'
import {
  deriveProjectMeta,
  episodeIndexLogline,
  flattenSeriesBible,
  resolveContextEpisodePremise,
  storyPlanFromJson,
} from '@/domains/storyteller/services/context-assembly-parsers'

export interface StoryCanonCastMember {
  name: string
  role: string
  description: string
  motivation: string
}

export interface StoryCanonEpisodeIndexRow {
  id: string
  sequence: number
  title: string
  logline: string
}

export interface StoryCanonEpisodeSource {
  id: string
  sequence: number
  title: string | null
  premise: string | null
  storyPlan: unknown
  tenPointsPlan: unknown
  thematicFocus: string | null
}

export interface StoryCanonCharacterSource {
  name: string
  role: string
  description: string | null
  psychology: unknown
}

export interface StoryCanonPackSources {
  projectName: string
  seriesBible: unknown
  storyPlanContent: unknown
  projectStoryPlan: unknown
  episodes: StoryCanonEpisodeSource[]
  characters: StoryCanonCharacterSource[]
}

export interface StoryCanonPack {
  projectId: string
  projectName: string
  storyPlan: Record<string, unknown>
  bible: Record<string, unknown>
  genre: string
  tone: string
  worldDescription: string
  roadmap: RoadmapSlot[]
  episodeIndex: StoryCanonEpisodeIndexRow[]
  cast: StoryCanonCastMember[]
}

export interface OpenEpisodeCanon extends StoryCanonPack {
  episodeId: string
  episodeSequence: number
  slot: RoadmapSlot | undefined
  premise: Record<string, unknown>
  thematicFocus: string
}

export interface StoryCanonPackDeps {
  loadSources?: (projectId: string) => Promise<StoryCanonPackSources | null>
}

function hasRawPlan(value: unknown): boolean {
  return Object.keys(recordFromJson(value)).length > 0
}

function presentMeta(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === ContextAssemblyFallback.NotSet) return ''
  return trimmed
}

function clip(value: string, max: number): string {
  if (value.length <= max) return value
  return value.slice(0, max)
}

function motivationFromPsychology(psychology: unknown): string {
  return readString(recordFromJson(psychology)[StoryCanonPsychologyField.ActualMotivation]) ?? ''
}

function compactCast(rows: StoryCanonCharacterSource[]): StoryCanonCastMember[] {
  return rows.slice(0, StoryCanonPackLimit.CastCount).map(row => ({
    name: row.name,
    role: row.role,
    description: clip(row.description?.trim() ?? '', StoryCanonPackLimit.CastDescriptionChars),
    motivation: clip(
      motivationFromPsychology(row.psychology).trim(),
      StoryCanonPackLimit.CastDescriptionChars
    ),
  }))
}

function compactEpisodeIndex(rows: StoryCanonEpisodeSource[]): StoryCanonEpisodeIndexRow[] {
  return [...rows]
    .sort((left, right) => left.sequence - right.sequence)
    .slice(0, StoryCanonPackLimit.EpisodeIndexCount)
    .map(row => ({
      id: row.id,
      sequence: row.sequence,
      title: row.title?.trim() ?? '',
      logline: episodeIndexLogline(row),
    }))
}

/**
 * Pure assembler over already-loaded rows: it performs no I/O, and the id is
 * only carried into the result's metadata. The ownership check belongs on
 * `loadStoryCanonPack`, which is what actually reads the database.
 *
 * project-scope: none — pure function over rows the caller already fetched.
 */
export function assembleStoryCanonPack(
  projectId: string,
  sources: StoryCanonPackSources
): StoryCanonPack {
  const fromTable = storyPlanFromJson(sources.storyPlanContent)
  const fromProject = storyPlanFromJson(sources.projectStoryPlan)
  const storyPlan = hasRawPlan(sources.storyPlanContent) ? fromTable : fromProject
  const rawBible = parseSeriesBibleRecord(sources.seriesBible)
  const bible = flattenSeriesBible(rawBible, BIBLE_CATEGORY_KEYS)
  const meta = deriveProjectMeta(
    storyPlan,
    bible,
    ContextAssemblyFallback.NotSet,
    StorytellerAnswerSeparator.CommaSpace
  )
  const worldDescription =
    readString(storyPlan.worldDescription) || readString(bible.worldDescription) || ''

  return {
    projectId,
    projectName: sources.projectName,
    storyPlan,
    bible,
    genre: presentMeta(meta.genre),
    tone: presentMeta(meta.tone),
    worldDescription: worldDescription.trim(),
    roadmap: resolveRoadmapList(storyPlan),
    episodeIndex: compactEpisodeIndex(sources.episodes),
    cast: compactCast(sources.characters),
  }
}

export function assembleOpenEpisodeCanon(
  pack: StoryCanonPack,
  episode: StoryCanonEpisodeSource
): OpenEpisodeCanon {
  const premise = resolveContextEpisodePremise({
    episodeStoryPlan: episode.storyPlan,
    episodePremiseText: episode.premise,
    episodeTenPoints: episode.tenPointsPlan,
    projectStoryPlan: pack.storyPlan,
    bible: pack.bible,
  })
  return {
    ...pack,
    episodeId: episode.id,
    episodeSequence: episode.sequence,
    slot: resolveRoadmapSlot(pack.storyPlan, episode.sequence),
    premise,
    thematicFocus: episode.thematicFocus?.trim() ?? '',
  }
}

async function defaultLoadSources(projectId: string): Promise<StoryCanonPackSources | null> {
  const [project, storyPlanRow, episodeRows, characterRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.id, projectId)).then(rows => rows[0]),
    db.select().from(storyPlans).where(eq(storyPlans.projectId, projectId)).then(rows => rows[0]),
    db
      .select({
        id: episodes.id,
        sequence: episodes.sequence,
        title: episodes.title,
        premise: episodes.premise,
        storyPlan: episodes.storyPlan,
        tenPointsPlan: episodes.tenPointsPlan,
        thematicFocus: episodes.thematicFocus,
      })
      .from(episodes)
      .where(eq(episodes.projectId, projectId)),
    db
      .select({
        name: characters.name,
        role: characters.role,
        description: characters.description,
        psychology: characters.psychology,
      })
      .from(characters)
      .where(eq(characters.projectId, projectId)),
  ])

  if (!project) return null

  return {
    projectName: project.name,
    seriesBible: project.seriesBible,
    storyPlanContent: storyPlanRow?.content,
    projectStoryPlan: project.storyPlan,
    episodes: episodeRows,
    characters: characterRows,
  }
}

export async function loadStoryCanonPack(
  scope: ProjectScope,
  deps: StoryCanonPackDeps = {}
): Promise<StoryCanonPack | null> {
  const loadSources = deps.loadSources ?? defaultLoadSources
  const sources = await loadSources(scope.projectId)
  if (!sources) return null
  return assembleStoryCanonPack(scope.projectId, sources)
}

export async function loadOpenEpisodeCanon(
  scope: ProjectScope,
  episodeId: string,
  deps: StoryCanonPackDeps = {}
): Promise<OpenEpisodeCanon | null> {
  const { projectId } = scope
  const loadSources = deps.loadSources ?? defaultLoadSources
  const sources = await loadSources(projectId)
  if (!sources) return null
  const episode = sources.episodes.find(row => row.id === episodeId)
  if (!episode) return null
  return assembleOpenEpisodeCanon(assembleStoryCanonPack(projectId, sources), episode)
}
