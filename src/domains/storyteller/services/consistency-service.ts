/**
 * ConsistencyService - GRRM Solo Model
 *
 * Extracted logic from judges/ConsistencyAgent.ts (now deleted).
 * Server-only, returns Result<T>.
 * Called by checkContinuityTool and consistency routes.
 */

import 'server-only'
import { db } from '@/db/client'
import { beats, projects, episodes } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'
import {
  BeatRow,
  ConsistencyCheckKind,
  setupsPayoffsFromJson,
  shouldRunCheck,
} from './consistency-types'
import {
  CONSISTENCY_SEVERITY_ORDER,
  ConsistencyIssueType,
  ConsistencyServiceError,
  ConsistencySeverity,
  ConsistencySuggestion,
  ConsistencyUnknownLocation,
} from '@/domains/storyteller/services/constants/consistency-issues'

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

export { ConsistencyCheckKind } from './consistency-types'

// ==========================================
// TYPES
// ==========================================

export interface ContinuityIssue {
  type:
    | 'contradiction'
    | 'timeline'
    | 'character'
    | 'missing_payoff'
    | 'orphaned_setup'
    | 'knowledge_violation'
  severity: 'critical' | 'major' | 'minor'
  description: string
  location: string
  affectedElements: string[]
  suggestion?: string
}

export interface ConsistencyCheckInput {
  projectId: string
  episodeId?: string
  beatIds?: string[]
  checkTypes?: ConsistencyCheckKind[]
}

export interface ConsistencyCheckResult {
  issues: ContinuityIssue[]
  summary?: {
    beatsChecked: number
    issuesFound: number
    critical: number
    major: number
    minor: number
  }
}

function countIssuesBySeverity(issues: ContinuityIssue[]) {
  return issues.reduce(
    (counts, issue) => {
      if (issue.severity === ConsistencySeverity.Critical) counts.critical += 1
      else if (issue.severity === ConsistencySeverity.Major) counts.major += 1
      else if (issue.severity === ConsistencySeverity.Minor) counts.minor += 1
      return counts
    },
    { critical: 0, major: 0, minor: 0 }
  )
}

// ==========================================
// CONSISTENCY SERVICE
// ==========================================

/**
 * Run consistency check
 * Consolidates the logic from old ConsistencyAgent
 */
export async function runConsistencyCheck(
  input: ConsistencyCheckInput
): Promise<Result<ConsistencyCheckResult>> {
  try {
      const { projectId, episodeId, beatIds, checkTypes = [ConsistencyCheckKind.ALL] } = input

      // Fetch project with storyPlan (contains worldRules, etc.)
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

      if (!project) {
        return { ok: false, error: `Project ${projectId} not found` }
      }

      // Determine which beats to check
      let beatsToCheck: BeatRow[] = []

      if (beatIds && beatIds.length > 0) {
        // Specific beats
        beatsToCheck = await db
          .select()
          .from(beats)
          .where(and(eq(beats.episodeId, episodeId || ''), inArray(beats.id, beatIds)))
      } else if (episodeId) {
        // All beats in episode
        beatsToCheck = await db.select().from(beats).where(eq(beats.episodeId, episodeId))
      } else {
        // All beats in project (expensive)
        const projectEpisodes = await db
          .select()
          .from(episodes)
          .where(eq(episodes.projectId, projectId))
        const episodeIds = projectEpisodes.map(ep => ep.id)
        if (episodeIds.length > 0) {
          beatsToCheck = await db.select().from(beats).where(inArray(beats.episodeId, episodeIds))
        }
      }

      if (beatsToCheck.length === 0) {
        return {
          ok: true,
          value: {
            issues: [],
            summary: {
              beatsChecked: 0,
              issuesFound: 0,
              critical: 0,
              major: 0,
              minor: 0,
            },
          },
        }
      }

      // Run checks
      const allIssues: ContinuityIssue[] = []

      if (shouldRunCheck(checkTypes, ConsistencyCheckKind.SETUP_PAYOFF)) {
        allIssues.push(...checkSetupPayoffs(beatsToCheck))
      }

      // TODO: character_knowledge and timeline checks can be added here
      // For MVP, world_rules and setup_payoff are the core checks

      // Sort by severity
      const severityOrder = CONSISTENCY_SEVERITY_ORDER
      allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

      const { critical: criticalCount, major: majorCount, minor: minorCount } =
        countIssuesBySeverity(allIssues)

      return {
        ok: true,
        value: {
          issues: allIssues,
          summary: {
            beatsChecked: beatsToCheck.length,
            issuesFound: allIssues.length,
            critical: criticalCount,
            major: majorCount,
            minor: minorCount,
          },
        },
      }
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : ConsistencyServiceError.UnknownCheckError,
      }
    }
}

function checkSetupPayoffs(beatsToCheck: BeatRow[]): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const beatsWithSetups: typeof beatsToCheck = []
  const beatsWithPayoffs: typeof beatsToCheck = []
  for (const b of beatsToCheck) {
    const sp = setupsPayoffsFromJson(b.setupsPayoffs)
    if (sp.setupId) beatsWithSetups.push(b)
    if (sp.payoffFor) beatsWithPayoffs.push(b)
  }

  beatsWithPayoffs.forEach(beat => {
    const payoffFor = setupsPayoffsFromJson(beat.setupsPayoffs).payoffFor
    const setupExists = beatsWithSetups.some(
      b => setupsPayoffsFromJson(b.setupsPayoffs).setupId === payoffFor
    )
    if (!setupExists) {
      issues.push({
        type: ConsistencyIssueType.OrphanedSetup,
        severity: ConsistencySeverity.Major,
        description: `Payoff "${payoffFor}" in beat [${beat.sequence}] has no setup`,
        location: beat.id,
        affectedElements: [payoffFor || ConsistencyUnknownLocation.Unknown],
        suggestion: ConsistencySuggestion.CreateSetupEarlier,
      })
    }
  })

  beatsWithSetups.forEach(beat => {
    const setupId = setupsPayoffsFromJson(beat.setupsPayoffs).setupId
    const hasPayoff = beatsWithPayoffs.some(
      b => setupsPayoffsFromJson(b.setupsPayoffs).payoffFor === setupId
    )
    if (!hasPayoff) {
      issues.push({
        type: ConsistencyIssueType.MissingPayoff,
        severity: ConsistencySeverity.Minor,
        description: `Setup "${setupId}" in beat [${beat.sequence}] has no payoff yet`,
        location: beat.id,
        affectedElements: [setupId ?? ConsistencyUnknownLocation.Unknown],
        suggestion: ConsistencySuggestion.AddPayoffBeat,
      })
    }
  })

  return issues
}
