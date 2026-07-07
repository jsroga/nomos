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

export type Result<T> = { ok: true; value: T } | { ok: false; error: string }

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
  checkTypes?: Array<'world_rules' | 'character_knowledge' | 'setup_payoff' | 'timeline' | 'all'>
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
      const { projectId, episodeId, beatIds, checkTypes = ['all'] } = input

      // Fetch project with storyPlan (contains worldRules, etc.)
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

      if (!project) {
        return { ok: false, error: `Project ${projectId} not found` }
      }

      // Determine which beats to check
      let beatsToCheck: any[] = []

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
      const storyPlan = (project.storyPlan as any) || {}

      const shouldCheck = (type: string) =>
        checkTypes.includes('all') || checkTypes.includes(type as any)

      if (shouldCheck('world_rules')) {
        allIssues.push(...checkWorldRuleViolations(beatsToCheck, storyPlan))
      }

      if (shouldCheck('setup_payoff')) {
        allIssues.push(...checkSetupPayoffs(beatsToCheck))
      }

      // TODO: character_knowledge and timeline checks can be added here
      // For MVP, world_rules and setup_payoff are the core checks

      // Sort by severity
      const severityOrder = { critical: 0, major: 1, minor: 2 }
      allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

      const criticalCount = allIssues.filter(i => i.severity === 'critical').length
      const majorCount = allIssues.filter(i => i.severity === 'major').length
      const minorCount = allIssues.filter(i => i.severity === 'minor').length

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
        error: error instanceof Error ? error.message : 'Unknown consistency check error',
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

function checkWorldRuleViolations(beats: any[], storyPlan: any): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const worldRules = storyPlan.worldRules || []
  if (!Array.isArray(worldRules)) return issues

  beats.forEach(beat => {
    const content = ((beat.logline || '') + ' ' + (beat.content || '')).toLowerCase()
    worldRules.forEach((rule: any) => {
      const ruleText = typeof rule === 'string' ? rule : rule.rule || ''
      const consequence = typeof rule === 'string' ? null : rule.consequence
      const violationKeywords = extractViolationKeywords(ruleText)
      violationKeywords.forEach(keyword => {
        if (content.includes(keyword.term) && keyword.violation) {
          issues.push({
            type: 'contradiction',
            severity: 'critical',
            description: `Beat [${beat.sequence}] may violate: "${ruleText}"`,
            location: beat.id,
            affectedElements: [ruleText],
            suggestion: consequence || 'Revise beat to comply with world rules',
          })
        }
      })
    })
  })
  return issues
}

function checkSetupPayoffs(beats: any[]): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const beatsWithSetups = beats.filter(b => b.setupsPayoffs?.setupId)
  const beatsWithPayoffs = beats.filter(b => b.setupsPayoffs?.payoffFor)

  beatsWithPayoffs.forEach(beat => {
    const payoffFor = beat.setupsPayoffs.payoffFor
    const setupExists = beatsWithSetups.some(b => b.setupsPayoffs?.setupId === payoffFor)
    if (!setupExists) {
      issues.push({
        type: 'orphaned_setup',
        severity: 'major',
        description: `Payoff "${payoffFor}" in beat [${beat.sequence}] has no setup`,
        location: beat.id,
        affectedElements: [payoffFor || 'unknown'],
        suggestion: 'Create the setup in an earlier beat',
      })
    }
  })

  // Check for unresolved setups (no payoff yet)
  beatsWithSetups.forEach(beat => {
    const setupId = beat.setupsPayoffs.setupId
    const hasPayoff = beatsWithPayoffs.some(b => b.setupsPayoffs?.payoffFor === setupId)
    if (!hasPayoff) {
      // This is a minor issue since the setup might be paid off in a future beat
      issues.push({
        type: 'missing_payoff',
        severity: 'minor',
        description: `Setup "${setupId}" in beat [${beat.sequence}] has no payoff yet`,
        location: beat.id,
        affectedElements: [setupId],
        suggestion: 'Add a beat that pays off this setup',
      })
    }
  })

  return issues
}
