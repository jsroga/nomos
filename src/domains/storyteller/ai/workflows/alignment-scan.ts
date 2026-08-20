import '@/shared/data/server-guard'

import {
  ALIGNMENT_REGISTRY,
  ALIGNMENT_SCAN_INSTRUCTIONS,
  AlignmentMatchBy,
  AlignmentScanLabel,
  AlignmentSection,
  type AlignmentRule,
} from '../../core/constants/alignment-registry'
import {
  formatRoadmapSlotBrief,
  roadmapSlotFromUnknown,
} from '../../core/utils/roadmap-slot'
import { recordArrayFromJson } from '../../../../shared/data/json-guards'
import type { AssembledCanon } from './fix-inconsistencies-contract'
import type { ContinuityFinding } from './fix-inconsistencies-schema'
import {
  FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY,
  FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT,
  FIX_INCONSISTENCIES_PROMPT_JOIN,
} from './constants/fix-inconsistencies-workflow'

export interface AlignmentScanJob {
  section: AlignmentSection
  episodeId?: string
  episodeSequence?: number
  prompt: string
}

function jsonValue(text: string): unknown {
  try {
    const value: unknown = JSON.parse(text)
    return value
  } catch {
    return null
  }
}

function isEmptySlice(text: string): boolean {
  const trimmed = text.trim()
  return (
    trimmed.length === 0 ||
    trimmed === FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT ||
    trimmed === FIX_INCONSISTENCIES_EMPTY_JSON_ARRAY
  )
}

function sectionSlice(
  canon: AssembledCanon,
  section: AlignmentSection,
  episodeId?: string
): string {
  if (episodeId) {
    const episode = canon.episodes.find(row => row.episodeId === episodeId)
    if (episode) {
      if (section === AlignmentSection.EpisodePremise) return episode.premiseJson
      if (section === AlignmentSection.Beats) return episode.beatsJson
      if (section === AlignmentSection.EpisodeRoadmap) {
        return roadmapSlotSlice(canon, episode.sequence)
      }
    }
  }
  return canon.sectionsJson[section] ?? FIX_INCONSISTENCIES_EMPTY_JSON_OBJECT
}

function roadmapSlotSlice(canon: AssembledCanon, sequence: number): string {
  const roadmapJson = canon.sectionsJson[AlignmentSection.EpisodeRoadmap]
  if (!roadmapJson) {
    return formatRoadmapSlotBrief(undefined, sequence)
  }
  const slots = recordArrayFromJson(jsonValue(roadmapJson))
  const raw = slots[sequence - 1]
  if (!raw) return formatRoadmapSlotBrief(undefined, sequence)
  return formatRoadmapSlotBrief(roadmapSlotFromUnknown(raw), sequence)
}

function relatedBlock(
  canon: AssembledCanon,
  rule: AlignmentRule,
  episodeId?: string
): string {
  return rule.related
    .map(section =>
      [
        AlignmentScanLabel.Related,
        section,
        sectionSlice(canon, section, episodeId),
      ].join(FIX_INCONSISTENCIES_PROMPT_JOIN)
    )
    .join(FIX_INCONSISTENCIES_PROMPT_JOIN)
}

function jobForRule(
  canon: AssembledCanon,
  rule: AlignmentRule,
  episode?: AssembledCanon['episodes'][number]
): AlignmentScanJob | undefined {
  const episodeId = episode?.episodeId
  const subject = sectionSlice(canon, rule.section, episodeId)
  if (isEmptySlice(subject) && rule.matchBy !== AlignmentMatchBy.EpisodeSequence) {
    return undefined
  }
  if (rule.matchBy === AlignmentMatchBy.EpisodeSequence && isEmptySlice(subject)) {
    return undefined
  }
  const header = episode
    ? [
        AlignmentScanLabel.Episode,
        episode.title,
        String(episode.sequence),
      ]
    : []
  const prompt = [
    ALIGNMENT_SCAN_INSTRUCTIONS,
    ...header,
    AlignmentScanLabel.Section,
    rule.section,
    subject,
    AlignmentScanLabel.Granularity,
    rule.granularity,
    relatedBlock(canon, rule, episodeId),
  ].join(FIX_INCONSISTENCIES_PROMPT_JOIN)
  return {
    section: rule.section,
    episodeId,
    episodeSequence: episode?.sequence,
    prompt,
  }
}

export function buildAlignmentScanJobs(canon: AssembledCanon): AlignmentScanJob[] {
  const jobs: AlignmentScanJob[] = []
  for (const rule of ALIGNMENT_REGISTRY) {
    if (rule.matchBy === AlignmentMatchBy.EpisodeSequence) {
      for (const episode of canon.episodes) {
        const job = jobForRule(canon, rule, episode)
        if (job) jobs.push(job)
      }
      continue
    }
    const job = jobForRule(canon, rule)
    if (job) jobs.push(job)
  }
  return jobs
}

export function filterAlignmentScanJobs(
  jobs: AlignmentScanJob[],
  section: AlignmentSection,
  episodeId?: string
): AlignmentScanJob[] {
  return jobs.filter(job => {
    if (job.section !== section) return false
    if (episodeId && job.episodeId && job.episodeId !== episodeId) return false
    return true
  })
}

export async function collectAlignmentFindings(
  jobs: AlignmentScanJob[],
  scanChunk: (prompt: string) => Promise<ContinuityFinding[]>
): Promise<ContinuityFinding[]> {
  const findings: ContinuityFinding[] = []
  for (const job of jobs) {
    findings.push(...(await scanChunk(job.prompt)))
  }
  return findings
}
