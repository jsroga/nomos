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
  worldRulesFromStoryPlan,
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

// ==========================================
// CONSISTENCY SERVICE
// ==========================================

export class ConsistencyService {
  /**
   * Run consistency check
   * Consolidates the logic from old ConsistencyAgent
   */
  static async runConsistencyCheck(
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

      if (shouldRunCheck(checkTypes, ConsistencyCheckKind.WORLD_RULES)) {
        allIssues.push(...checkWorldRuleViolations(beatsToCheck, project.storyPlan))
      }

      if (shouldRunCheck(checkTypes, ConsistencyCheckKind.SETUP_PAYOFF)) {
        allIssues.push(...checkSetupPayoffs(beatsToCheck))
      }

      // TODO: character_knowledge and timeline checks can be added here
      // For MVP, world_rules and setup_payoff are the core checks

      // Sort by severity
      const severityOrder = CONSISTENCY_SEVERITY_ORDER
      allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

      const criticalCount = allIssues.filter(i => i.severity === ConsistencySeverity.Critical).length
      const majorCount = allIssues.filter(i => i.severity === ConsistencySeverity.Major).length
      const minorCount = allIssues.filter(i => i.severity === ConsistencySeverity.Minor).length

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
}

// ==========================================
// HELPER FUNCTIONS (extracted from ConsistencyAgent)
// ==========================================

function extractViolationKeywords(ruleText: string): { term: string; violation: boolean }[] {
  const negativePatterns = [
    /cannot\s+(\w+)/gi,
    /never\s+(\w+)/gi,
    /must not\s+(\w+)/gi,
    /forbidden to\s+(\w+)/gi,
  ]
  const keywords: { term: string; violation: boolean }[] = []
  negativePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(ruleText)) !== null) {
      keywords.push({ term: match[1].toLowerCase(), violation: true })
    }
  })
  return keywords
}

function checkWorldRuleViolations(beatsToCheck: BeatRow[], storyPlan: unknown): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const worldRules = worldRulesFromStoryPlan(storyPlan)
  if (worldRules.length === 0) return issues

  beatsToCheck.forEach(beat => {
    const content = ((beat.logline || '') + ' ' + (beat.content || '')).toLowerCase()
    worldRules.forEach(rule => {
      const ruleText = rule.rule
      const violationKeywords = extractViolationKeywords(ruleText)
      violationKeywords.forEach(keyword => {
        if (content.includes(keyword.term) && keyword.violation) {
          issues.push({
            type: ConsistencyIssueType.Contradiction,
            severity: ConsistencySeverity.Critical,
            description: `Beat [${beat.sequence}] may violate: "${ruleText}"`,
            location: beat.id,
            affectedElements: [ruleText],
            suggestion: rule.consequence || ConsistencySuggestion.ReviseBeatWorldRules,
          })
        }
      })
    })
  })
  return issues
}

function checkSetupPayoffs(beatsToCheck: BeatRow[]): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const beatsWithSetups = beatsToCheck.filter(b => {
    const sp = setupsPayoffsFromJson(b.setupsPayoffs)
    return Boolean(sp.setupId)
  })
  const beatsWithPayoffs = beatsToCheck.filter(b => {
    const sp = setupsPayoffsFromJson(b.setupsPayoffs)
    return Boolean(sp.payoffFor)
  })

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
