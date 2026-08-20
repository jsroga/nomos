import '@/shared/data/server-guard'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { beats, characters, episodes, projects, seriesBibles } from '@/db/schema'
import { generateStructured } from '@/domains/storyteller/ai/agents/critics/generate-structured'
import { continuityCritic } from '@/domains/storyteller/ai/agents/critics'
import { applyCascadingFixes } from '@/domains/storyteller/core/editing/cascade-editor'
import { getUndoManager } from '@/domains/storyteller/core/editing/undo-manager'
import { parseStoryPlanRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { AlignmentSection } from '@/domains/storyteller/core/constants/alignment-registry'
import { resolveRoadmapList } from '@/domains/storyteller/core/utils/roadmap-slot'
import { episodePremiseFromPlan } from '@/domains/storyteller/core/utils/validate-premise-for-beatboard'
import { BeatboardPremiseFieldKey } from '@/domains/storyteller/core/constants/beatboard-premise-validation'
import type { ConsistencyFix } from '@/domains/storyteller/core/types/consistency-types'
import { BeatStatus } from '@/domains/storyteller/core/types/enums'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { ConsistencyCheckKind, worldRulesFromStoryPlan } from '@/domains/storyteller/services/consistency-types'
import { statelessGrrmAuthor } from './stateless-agents'
import { filterLockedFixes } from './collapse-consistency-fixes'
import { buildAlignmentScanJobs, collectAlignmentFindings } from './alignment-scan'
import {
  FIX_INCONSISTENCIES_CANON_CHAR_BUDGET,
  FIX_INCONSISTENCIES_CANON_TRUNCATED,
  FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY,
  FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT,
  FIX_INCONSISTENCIES_PROMPT_JOIN,
  FIX_INCONSISTENCIES_PROPOSE_FIXES_PROMPT,
  FIX_INCONSISTENCIES_PROPOSE_INSTRUCTIONS,
  FIX_INCONSISTENCIES_SCAN_INSTRUCTIONS,
  FIX_INCONSISTENCIES_UNTITLED_EPISODE,
  FixInconsistenciesCanonSection,
} from './constants/fix-inconsistencies-workflow'
import type { AssembledCanon } from './fix-inconsistencies-contract'
import type { FixInconsistenciesDeps } from './fix-inconsistencies-deps-types'
import {
  ConsistencyFixBatchSchema,
  ContinuityAffectedKind,
  ContinuityScanReportSchema,
  type ConsistencyFixItem,
  type ContinuityFinding,
} from './fix-inconsistencies-schema'

function stringifyJson(value: unknown, fallback: string): string {
  try {
    return JSON.stringify(value)
  } catch {
    return fallback
  }
}

function truncateCanon(text: string): string {
  if (text.length <= FIX_INCONSISTENCIES_CANON_CHAR_BUDGET) return text
  return `${text.slice(0, FIX_INCONSISTENCIES_CANON_CHAR_BUDGET)}${FIX_INCONSISTENCIES_CANON_TRUNCATED}`
}

function joinPrompt(parts: string[]): string {
  return parts.join(FIX_INCONSISTENCIES_PROMPT_JOIN)
}

function emptyCanon(projectId: string): AssembledCanon {
  return {
    empty: true,
    projectId,
    bibleJson: FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT,
    charactersJson: FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY,
    worldRulesJson: FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY,
    sectionsJson: {},
    episodes: [],
    bibleLocked: false,
    lockedBeatIds: [],
    lockedCharacterIds: [],
  }
}

function hasJsonContent(value: unknown): boolean {
  return Object.keys(recordFromJson(value)).length > 0
}

function episodePremiseJson(episode: {
  storyPlan: unknown
  premise: string | null
}): string {
  const fromPlan = episodePremiseFromPlan(episode.storyPlan) ?? {}
  const logline =
    readString(fromPlan[BeatboardPremiseFieldKey.Logline]) || readString(episode.premise)
  if (logline && !readString(fromPlan[BeatboardPremiseFieldKey.Logline])) {
    return stringifyJson(
      { ...fromPlan, [BeatboardPremiseFieldKey.Logline]: logline },
      FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT
    )
  }
  return stringifyJson(fromPlan, FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT)
}

function buildSectionsJson(input: {
  storyPlan: Record<string, unknown>
  bibleContent: unknown
  charactersJson: string
  worldRulesJson: string
  episodes: AssembledCanon['episodes']
}): Record<string, string> {
  const bible = recordFromJson(input.bibleContent)
  const emptyObj = FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT
  const emptyArr = FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY
  return {
    [AlignmentSection.WorldDescription]: stringifyJson(
      input.storyPlan.worldDescription ?? bible.worldDescription,
      emptyObj
    ),
    [AlignmentSection.WorldRules]: input.worldRulesJson,
    [AlignmentSection.Factions]: stringifyJson(
      input.storyPlan.factions ?? bible.factions,
      emptyArr
    ),
    [AlignmentSection.Inspirations]: stringifyJson(
      input.storyPlan.inspirations ?? bible.inspirations,
      emptyObj
    ),
    [AlignmentSection.PlotTwists]: stringifyJson(
      input.storyPlan.plotTwists ?? bible.plotTwists,
      emptyArr
    ),
    [AlignmentSection.EpisodeRoadmap]: stringifyJson(
      resolveRoadmapList(input.storyPlan),
      emptyArr
    ),
    [AlignmentSection.Cast]: input.charactersJson,
    [AlignmentSection.Items]: stringifyJson(input.storyPlan.items ?? bible.items, emptyArr),
    [AlignmentSection.Events]: stringifyJson(input.storyPlan.events ?? bible.events, emptyArr),
    [AlignmentSection.Soundtracks]: stringifyJson(
      input.storyPlan.soundtracks ?? bible.soundtracks,
      emptyArr
    ),
    [AlignmentSection.EpisodePremise]: stringifyJson(
      input.episodes.map(row => jsonValue(row.premiseJson)),
      emptyArr
    ),
    [AlignmentSection.Beats]: stringifyJson(
      input.episodes.map(row => jsonValue(row.beatsJson)),
      emptyArr
    ),
  }
}

function jsonValue(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text)
    return value
  } catch {
    return null
  }
}

export async function assembleCanon(projectId: string): Promise<AssembledCanon> {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId))
  if (!project) return emptyCanon(projectId)

  const [bibleRow] = await db
    .select()
    .from(seriesBibles)
    .where(eq(seriesBibles.projectId, projectId))

  const storyPlan = parseStoryPlanRecord(project.storyPlan)
  const bibleContent = bibleRow?.content ?? project.seriesBible
  const projectCharacters = await db
    .select()
    .from(characters)
    .where(eq(characters.projectId, projectId))
  const projectEpisodes = await db
    .select()
    .from(episodes)
    .where(eq(episodes.projectId, projectId))

  const chunks = []
  const lockedBeatIds: string[] = []
  for (const episode of projectEpisodes) {
    const episodeBeats = await db.select().from(beats).where(eq(beats.episodeId, episode.id))
    for (const beat of episodeBeats) {
      if (beat.status === BeatStatus.LOCKED) lockedBeatIds.push(beat.id)
    }
    chunks.push({
      episodeId: episode.id,
      title: episode.title ?? FIX_INCONSISTENCIES_UNTITLED_EPISODE,
      sequence: episode.sequence,
      premiseJson: episodePremiseJson(episode),
      beatsJson: stringifyJson(episodeBeats, FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY),
    })
  }

  const hasBeats = chunks.some(
    chunk => chunk.beatsJson !== FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY
  )
  const empty =
    !hasBeats && projectCharacters.length === 0 && !hasJsonContent(bibleContent)

  const charactersJson = stringifyJson(projectCharacters, FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY)
  const worldRulesJson = stringifyJson(
    worldRulesFromStoryPlan(storyPlan),
    FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY
  )

  return {
    empty,
    projectId,
    bibleJson: stringifyJson(bibleContent, FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT),
    charactersJson,
    worldRulesJson,
    sectionsJson: buildSectionsJson({
      storyPlan,
      bibleContent,
      charactersJson,
      worldRulesJson,
      episodes: chunks,
    }),
    episodes: chunks,
    bibleLocked: Boolean(bibleRow?.isLocked),
    lockedBeatIds,
    lockedCharacterIds: [],
  }
}

async function structuralScan(projectId: string) {
  const { runConsistencyCheck } = await import(
    '../../services/consistency-service'
  )
  const result = await runConsistencyCheck({
    projectId,
    checkTypes: [ConsistencyCheckKind.SETUP_PAYOFF],
  })
  if (!result.ok) return { issues: [] }
  return { issues: result.value.issues }
}

async function scanChunk(prompt: string): Promise<ContinuityFinding[]> {
  const report = await generateStructured(
    continuityCritic,
    joinPrompt([FIX_INCONSISTENCIES_SCAN_INSTRUCTIONS, prompt]),
    ContinuityScanReportSchema
  )
  return report?.findings ?? []
}

async function agenticScan(canon: AssembledCanon): Promise<ContinuityFinding[]> {
  return collectAlignmentFindings(buildAlignmentScanJobs(canon), prompt =>
    scanChunk(truncateCanon(prompt))
  )
}

async function proposeFixes(
  canon: AssembledCanon,
  findings: ContinuityFinding[]
): Promise<ConsistencyFixItem[]> {
  const prompt = joinPrompt([
    FIX_INCONSISTENCIES_PROPOSE_INSTRUCTIONS,
    FIX_INCONSISTENCIES_PROPOSE_FIXES_PROMPT,
    FixInconsistenciesCanonSection.Bible,
    truncateCanon(canon.bibleJson),
    FixInconsistenciesCanonSection.Findings,
    stringifyJson(findings, FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY),
  ])
  const batch = await generateStructured(
    statelessGrrmAuthor,
    prompt,
    ConsistencyFixBatchSchema
  )
  return batch?.fixes ?? []
}

function toCascadeFix(item: ConsistencyFixItem): ConsistencyFix {
  return {
    id: item.id,
    inconsistencyId: item.inconsistencyId,
    targetElement: item.targetElement,
    changes: item.changes,
  }
}

async function episodeIdForBeat(beatId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ episodeId: beats.episodeId })
    .from(beats)
    .where(eq(beats.id, beatId))
  return row?.episodeId
}

async function applyFixes(projectId: string, fixes: ConsistencyFixItem[]) {
  const cascadeFixes = fixes.map(toCascadeFix)
  const applied = []
  const errors: string[] = []
  let totalAffected = 0

  for (const fix of cascadeFixes) {
    const type = fix.targetElement.type
    let episodeId: string | undefined
    if (type === ContinuityAffectedKind.Beat) {
      episodeId = await episodeIdForBeat(fix.targetElement.id)
    } else if (
      type === ContinuityAffectedKind.Episode ||
      type === ContinuityAffectedKind.Premise
    ) {
      episodeId = fix.targetElement.id
    }
    const result = await applyCascadingFixes([fix], projectId, episodeId)
    totalAffected += result.totalAffected
    applied.push(...result.results)
    if (result.errors) errors.push(...result.errors)
  }

  const undoId = getUndoManager().recordConsistencyFix(cascadeFixes, applied)
  return {
    appliedCount: totalAffected,
    undoId,
    errors: errors.length > 0 ? errors : undefined,
  }
}

export const defaultFixInconsistenciesDeps: FixInconsistenciesDeps = {
  assembleCanon,
  structuralScan,
  agenticScan,
  proposeFixes,
  applyFixes,
  filterLocked: (canon, _findings, fixes) => filterLockedFixes(canon, fixes),
}
