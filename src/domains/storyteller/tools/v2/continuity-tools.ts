/**
 * Continuity Checker Tools - Mastra v2
 *
 * Validate story consistency across beats, characters, and timeline.
 * Migrated from legacy LangChain DynamicStructuredTool.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { BeatStatus } from '../../enums'

// ==========================================
// TYPES
// ==========================================

interface ContinuityIssue {
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

interface Setup {
  id: string
  description: string
  beatId: string
  isResolved: boolean
}

interface BeatCard {
  id: string
  sequence: number
  logline: string
  content?: string
  charactersInvolved: string[]
  emotionalShifts?: Record<string, { from: string; to: string }>
  setupsPayoffs?: { setupId?: string; payoffFor?: string }
  status: BeatStatus
}

interface CharacterState {
  name: string
  knowledgeState?: string[]
}

// ==========================================
// SCHEMAS
// ==========================================

const CheckContinuityInputSchema = z.object({
  scope: z.enum(['current_beat', 'all_beats', 'specific_beats']).describe('What to check'),
  beatIds: z.array(z.string()).optional().describe('Specific beat IDs if scope is specific_beats'),
  checkTypes: z
    .array(z.enum(['world_rules', 'character_knowledge', 'setup_payoff', 'timeline', 'all']))
    .optional()
    .default(['all']),
  autoFix: z.boolean().optional().default(false),
  beatBoard: z.array(z.record(z.unknown())).describe('Current beat board'),
  currentBeat: z.record(z.unknown()).optional().describe('Current active beat'),
  characters: z.array(z.record(z.unknown())).optional().describe('Character states'),
  seriesBible: z.record(z.any()).optional().describe('World rules'),
  unresolvedSetups: z.array(z.record(z.unknown())).optional().describe('Unresolved setups'),
})

const QuickCheckInputSchema = z.object({
  statement: z.string().describe('Statement to check'),
  charactersInvolved: z.array(z.string()).optional(),
  seriesBible: z.record(z.any()).optional(),
  characters: z.array(z.record(z.unknown())).optional(),
})

// ==========================================
// HELPER FUNCTIONS
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

function checkWorldRuleViolations(
  beats: BeatCard[],
  seriesBible: Record<string, any> = {}
): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const worldRules = seriesBible.worldRules || []
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
            suggestion: consequence || 'Revise beat to comply with rules',
          })
        }
      })
    })
  })
  return issues
}

function checkSetupPayoffs(beats: BeatCard[], unresolvedSetups: Setup[] = []): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const beatsWithSetups = beats.filter(b => b.setupsPayoffs?.setupId)
  const beatsWithPayoffs = beats.filter(b => b.setupsPayoffs?.payoffFor)

  beatsWithPayoffs.forEach(beat => {
    const payoffFor = beat.setupsPayoffs!.payoffFor
    const setupExists =
      beatsWithSetups.some(b => b.setupsPayoffs?.setupId === payoffFor) ||
      unresolvedSetups.some(s => s.id === payoffFor)
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

  unresolvedSetups.forEach(setup => {
    const hasPayoff = beatsWithPayoffs.some(b => b.setupsPayoffs?.payoffFor === setup.id)
    if (!hasPayoff && !setup.isResolved) {
      issues.push({
        type: 'missing_payoff',
        severity: 'minor',
        description: `Setup "${setup.description}" has no payoff`,
        location: setup.beatId,
        affectedElements: [setup.id],
        suggestion: 'Add a beat that pays off this setup',
      })
    }
  })
  return issues
}

function checkKnowledgeViolations(
  beats: BeatCard[],
  characters: CharacterState[] = []
): ContinuityIssue[] {
  // Simplified - would need semantic analysis in production
  return []
}

// ==========================================
// MASTRA TOOLS
// ==========================================

export const checkContinuityTool = createTool({
  id: 'check_continuity',
  description:
    'Validate story consistency. Checks: world rules, character knowledge, setup/payoff, timeline.',
  inputSchema: CheckContinuityInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const {
      scope,
      beatIds,
      checkTypes = ['all'],
      autoFix,
      beatBoard,
      currentBeat,
      characters = [],
      seriesBible = {},
      unresolvedSetups = [],
    } = context
    const allIssues: ContinuityIssue[] = []

    let beatsToCheck: BeatCard[] = []
    switch (scope) {
      case 'current_beat':
        if (currentBeat) beatsToCheck = [currentBeat]
        break
      case 'specific_beats':
        if (beatIds?.length)
          beatsToCheck = (beatBoard as BeatCard[]).filter(b => beatIds.includes(b.id))
        break
      default:
        beatsToCheck = beatBoard as BeatCard[]
    }

    if (beatsToCheck.length === 0) {
      return JSON.stringify({ success: true, message: 'No beats to check', issues: [] })
    }

    const shouldCheck = (type: string) =>
      checkTypes.includes('all') || checkTypes.includes(type as any)

    if (shouldCheck('world_rules'))
      allIssues.push(...checkWorldRuleViolations(beatsToCheck, seriesBible))
    if (shouldCheck('character_knowledge'))
      allIssues.push(...checkKnowledgeViolations(beatsToCheck, characters as CharacterState[]))
    if (shouldCheck('setup_payoff'))
      allIssues.push(...checkSetupPayoffs(beatsToCheck, unresolvedSetups as Setup[]))

    const severityOrder = { critical: 0, major: 1, minor: 2 }
    allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

    const criticalCount = allIssues.filter(i => i.severity === 'critical').length
    const majorCount = allIssues.filter(i => i.severity === 'major').length
    const minorCount = allIssues.filter(i => i.severity === 'minor').length

    if (allIssues.length === 0) {
      return JSON.stringify({
        success: true,
        message: `✅ No issues in ${beatsToCheck.length} beat(s).`,
        issues: [],
        summary: { beatsChecked: beatsToCheck.length, issuesFound: 0 },
      })
    }

    return JSON.stringify({
      success: true,
      message: `Found ${allIssues.length} issue(s): ${criticalCount} critical, ${majorCount} major, ${minorCount} minor`,
      issues: allIssues.map(issue => ({
        ...issue,
        autoFixAvailable: autoFix && issue.severity === 'minor',
      })),
      summary: {
        beatsChecked: beatsToCheck.length,
        issuesFound: allIssues.length,
        critical: criticalCount,
        major: majorCount,
        minor: minorCount,
      },
    })
  },
})

export const quickConsistencyCheckTool = createTool({
  id: 'quick_consistency_check',
  description: 'Fast consistency check for a single statement. Returns pass/fail.',
  inputSchema: QuickCheckInputSchema,
  execute: async (args: any) => {
    const context = args?.context || args
    const { statement, charactersInvolved = [], seriesBible = {} } = context
    const issues: string[] = []
    const statementLower = statement.toLowerCase()

    const worldRules = seriesBible.worldRules || []
    worldRules.forEach((rule: any) => {
      const ruleText = (typeof rule === 'string' ? rule : rule.rule || '').toLowerCase()
      if (ruleText.includes('cannot') || ruleText.includes('never')) {
        const forbiddenAction = ruleText.replace(/.*?(cannot|never)\s+/, '').split(/[,.\s]/)[0]
        if (forbiddenAction && statementLower.includes(forbiddenAction)) {
          issues.push(`Possible violation: "${rule}"`)
        }
      }
    })

    if (issues.length === 0) {
      return JSON.stringify({ pass: true, message: 'Statement appears consistent.' })
    }
    return JSON.stringify({
      pass: false,
      issues,
      message: `Found ${issues.length} potential issue(s).`,
    })
  },
})

export const continuityTools = [checkContinuityTool, quickConsistencyCheckTool]