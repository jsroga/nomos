import '@/shared/data/server-guard'
import { eq } from 'drizzle-orm'
import { db } from '@/db/client'
import { beats, characters, episodes, projects, seriesBibles } from '@/db/schema'
import { generateStructured } from '@/domains/storyteller/ai/agents/critics/generate-structured'
import { continuityCritic } from '@/domains/storyteller/ai/agents/critics'
import { applyCascadingFixes } from '@/domains/storyteller/core/editing/cascade-editor'
import { getUndoManager } from '@/domains/storyteller/core/editing/undo-manager'
import { parseStoryPlanRecord } from '@/domains/storyteller/core/io/project-jsonb'
import type { ConsistencyFix } from '@/domains/storyteller/core/types/consistency-types'
import { BeatStatus } from '@/domains/storyteller/core/types/enums'
import { recordFromJson } from '@/shared/data/json-guards'
import { ConsistencyCheckKind, worldRulesFromStoryPlan } from '@/domains/storyteller/services/consistency-types'
import { statelessGrrmAuthor } from './stateless-agents'
import { filterLockedFixes } from './collapse-consistency-fixes'
import {
  FIX_INCONSISTENCIES_AGENTIC_SCAN_PROMPT,
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
    episodes: [],
    bibleLocked: false,
    lockedBeatIds: [],
    lockedCharacterIds: [],
  }
}

function hasJsonContent(value: unknown): boolean {
  return Object.keys(recordFromJson(value)).length > 0
}

async function assembleCanon(projectId: string): Promise<AssembledCanon> {
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
      beatsJson: stringifyJson(episodeBeats, FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY),
    })
  }

  const hasBeats = chunks.some(
    chunk => chunk.beatsJson !== FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY
  )
  const empty =
    !hasBeats && projectCharacters.length === 0 && !hasJsonContent(bibleContent)

  return {
    empty,
    projectId,
    bibleJson: stringifyJson(bibleContent, FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT),
    charactersJson: stringifyJson(projectCharacters, FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY),
    worldRulesJson: stringifyJson(
      worldRulesFromStoryPlan(storyPlan),
      FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY
    ),
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
  const findings: ContinuityFinding[] = []
  const bibleVsCast = joinPrompt([
    FIX_INCONSISTENCIES_AGENTIC_SCAN_PROMPT,
    FixInconsistenciesCanonSection.Bible,
    truncateCanon(canon.bibleJson),
    FixInconsistenciesCanonSection.Characters,
    truncateCanon(canon.charactersJson),
    FixInconsistenciesCanonSection.WorldRules,
    truncateCanon(canon.worldRulesJson),
  ])
  findings.push(...(await scanChunk(bibleVsCast)))

  for (const episode of canon.episodes) {
    const prompt = joinPrompt([
      FIX_INCONSISTENCIES_AGENTIC_SCAN_PROMPT,
      FixInconsistenciesCanonSection.Bible,
      truncateCanon(canon.bibleJson),
      FixInconsistenciesCanonSection.Episode,
      episode.title,
      truncateCanon(episode.beatsJson),
    ])
    findings.push(...(await scanChunk(prompt)))
  }
  return findings
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
