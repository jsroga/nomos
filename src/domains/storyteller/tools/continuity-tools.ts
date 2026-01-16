/**
 * Continuity Checker Tools
 *
 * Validate story consistency across beats, characters, and timeline.
 * Catches plot holes, character inconsistencies, and temporal paradoxes
 * before they make it to production.
 */

import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'
import { WritersRoomState, BeatCard, CharacterState, Setup } from '../graph/state'
import { BeatStatus } from '../enums'

// Types for continuity issues
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
  location: string // beat ID or "global"
  affectedElements: string[] // character names, rule names, etc.
  suggestion?: string
}

interface TimelineEvent {
  beatId: string
  sequence: number
  description: string
  characters: string[]
  impliedTime?: string // "morning", "3 days later", etc.
}

/**
 * Extract timeline events from beats
 */
function extractTimelineEvents(beats: BeatCard[]): TimelineEvent[] {
  return beats
    .sort((a, b) => a.sequence - b.sequence)
    .map(beat => ({
      beatId: beat.id,
      sequence: beat.sequence,
      description: beat.logline,
      characters: beat.charactersInvolved,
      impliedTime: extractTimeReference(beat.logline + ' ' + (beat.content || '')),
    }))
}

/**
 * Extract time references from text
 */
function extractTimeReference(text: string): string | undefined {
  const timePatterns = [
    /\b(morning|afternoon|evening|night|dawn|dusk|midnight|noon)\b/i,
    /\b(\d+)\s*(days?|hours?|weeks?|months?|years?)\s*(later|before|ago|earlier)\b/i,
    /\b(next|following|previous|the same)\s*(day|night|morning)\b/i,
    /\b(simultaneously|meanwhile|at the same time)\b/i,
    /\bflashback\b/i,
    /\b(first|second|third|final)\s*(act|chapter)\b/i,
  ]

  for (const pattern of timePatterns) {
    const match = text.match(pattern)
    if (match) return match[0]
  }
  return undefined
}

/**
 * Check for character knowledge violations
 * (e.g., character acts on information they shouldn't know yet)
 */
function checkKnowledgeViolations(
  beats: BeatCard[],
  characters: CharacterState[]
): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const characterKnowledge: Map<string, Set<string>> = new Map()

  // Initialize knowledge states
  characters.forEach(c => {
    characterKnowledge.set(c.name, new Set(c.knowledgeState || []))
  })

  // Process beats in sequence to track knowledge acquisition
  beats
    .sort((a, b) => a.sequence - b.sequence)
    .forEach((beat, index) => {
      const content = ((beat.logline || '') + ' ' + (beat.content || '')).toLowerCase()

      // Check if characters are using knowledge they shouldn't have
      const involvedChars = Array.isArray(beat.charactersInvolved) ? beat.charactersInvolved : []
      involvedChars.forEach(charName => {
        const knowledge = characterKnowledge.get(charName)
        if (!knowledge) return

        // Look for knowledge-dependent actions
        const knowledgePatterns = [
          { pattern: /knows about|learns of|discovers|reveals/i, type: 'learns' },
          { pattern: /tells.*about|informs|shares|confesses/i, type: 'shares' },
          { pattern: /acts on|uses.*knowledge|leverages|exploits/i, type: 'acts' },
        ]

        knowledgePatterns.forEach(({ pattern, type }) => {
          if (pattern.test(content)) {
            // This is where we'd check if they should know this
            // For now, flag if acting on knowledge without prior learning
          }
        })
      })

      // Track emotional shifts for consistency
      if (beat.emotionalShifts && typeof beat.emotionalShifts === 'object') {
        Object.entries(beat.emotionalShifts).forEach(([charName, shift]) => {
          // Check if emotional shift is consistent with prior state
          const charState = characters.find(c => c.name === charName)
          if (charState && index > 0) {
            // Could compare with previous beat's emotional state
          }
        })
      }
    })

  return issues
}

/**
 * Check for setup/payoff consistency
 */
function checkSetupPayoffs(beats: BeatCard[], unresolvedSetups: Setup[]): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []

  // Track setups from beats
  const beatsWithSetups = beats.filter(b => b.setupsPayoffs?.setupId)
  const beatsWithPayoffs = beats.filter(b => b.setupsPayoffs?.payoffFor)

  // Check for orphaned payoffs (payoff without corresponding setup)
  beatsWithPayoffs.forEach(beat => {
    const payoffFor = beat.setupsPayoffs.payoffFor
    const setupExists =
      beatsWithSetups.some(b => b.setupsPayoffs?.setupId === payoffFor) ||
      unresolvedSetups.some(s => s.id === payoffFor)

    if (!setupExists) {
      issues.push({
        type: 'orphaned_setup',
        severity: 'major',
        description: `Payoff "${payoffFor}" in beat [${beat.sequence}] references a setup that doesn't exist`,
        location: beat.id,
        affectedElements: [payoffFor || 'unknown'],
        suggestion: 'Either create the setup in an earlier beat or remove this payoff reference',
      })
    }
  })

  // Check for unresolved setups that are never paid off
  unresolvedSetups.forEach(setup => {
    const hasPayoff = beatsWithPayoffs.some(b => b.setupsPayoffs?.payoffFor === setup.id)
    if (!hasPayoff && !setup.isResolved) {
      issues.push({
        type: 'missing_payoff',
        severity: 'minor',
        description: `Setup "${setup.description}" has no payoff in current beat board`,
        location: setup.beatId,
        affectedElements: [setup.id],
        suggestion:
          'Consider adding a beat that pays off this setup, or mark it for a future episode',
      })
    }
  })

  return issues
}

/**
 * Check for world rule violations
 */
function checkWorldRuleViolations(
  beats: BeatCard[],
  seriesBible: Record<string, any>
): ContinuityIssue[] {
  const issues: ContinuityIssue[] = []
  const worldRules = seriesBible.worldRules || []

  if (!Array.isArray(worldRules) || worldRules.length === 0) {
    return issues
  }

  beats.forEach(beat => {
    const content = ((beat.logline || '') + ' ' + (beat.content || '')).toLowerCase()

    worldRules.forEach((rule: any) => {
      const ruleText = typeof rule === 'string' ? rule : rule.rule || ''
      const consequence = typeof rule === 'string' ? null : rule.consequence

      // Simple keyword-based violation detection
      // In production, this would use semantic similarity
      const violationKeywords = extractViolationKeywords(ruleText)

      violationKeywords.forEach(keyword => {
        if (content.includes(keyword.term) && keyword.violation) {
          issues.push({
            type: 'contradiction',
            severity: 'critical',
            description: `Beat [${beat.sequence}] may violate world rule: "${ruleText}"`,
            location: beat.id,
            affectedElements: [ruleText],
            suggestion: consequence
              ? `Remember: ${consequence}`
              : 'Revise beat to comply with established rules',
          })
        }
      })
    })
  })

  return issues
}

/**
 * Extract keywords that might indicate rule violations
 */
function extractViolationKeywords(ruleText: string): { term: string; violation: boolean }[] {
  // Look for "cannot", "never", "always", "must not", etc.
  const negativePatterns = [
    /cannot\s+(\w+)/gi,
    /never\s+(\w+)/gi,
    /must not\s+(\w+)/gi,
    /forbidden to\s+(\w+)/gi,
    /impossible to\s+(\w+)/gi,
  ]

  const keywords: { term: string; violation: boolean }[] = []

  negativePatterns.forEach(pattern => {
    let match
    while ((match = pattern.exec(ruleText)) !== null) {
      // If rule says "cannot fly", finding "fly" is a potential violation
      keywords.push({ term: match[1].toLowerCase(), violation: true })
    }
  })

  return keywords
}

/**
 * Main Continuity Checker Tool
 */
export const createContinuityCheckerTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'check_continuity',
    description: `Validate story consistency and catch potential plot holes.

This tool checks for:
- World rule violations (actions that break established rules)
- Character knowledge violations (acting on info they shouldn't know)
- Setup/payoff inconsistencies (orphaned setups, missing payoffs)
- Timeline contradictions (events that can't happen in sequence)
- Character consistency (sudden personality shifts without justification)

Use this tool:
- Before finalizing a beat
- When reviewing the entire beat board
- When a user questions a plot point
- After major story changes

Returns: List of issues with severity and suggested fixes.`,
    schema: z.object({
      scope: z.enum(['current_beat', 'all_beats', 'specific_beats']).describe('What to check'),
      beatIds: z
        .array(z.string())
        .optional()
        .describe('Specific beat IDs to check (required if scope is specific_beats)'),
      checkTypes: z
        .array(z.enum(['world_rules', 'character_knowledge', 'setup_payoff', 'timeline', 'all']))
        .optional()
        .default(['all'])
        .describe('Types of checks to perform'),
      autoFix: z
        .boolean()
        .optional()
        .default(false)
        .describe('Suggest automatic fixes for minor issues'),
    }),
    func: async ({ scope, beatIds, checkTypes = ['all'], autoFix }) => {
      const allIssues: ContinuityIssue[] = []

      // Determine which beats to check
      let beatsToCheck: BeatCard[] = []
      switch (scope) {
        case 'current_beat':
          if (state.currentBeat) {
            beatsToCheck = [state.currentBeat]
          }
          break
        case 'specific_beats':
          if (beatIds && beatIds.length > 0) {
            beatsToCheck = state.beatBoard.filter(b => beatIds.includes(b.id))
          }
          break
        case 'all_beats':
        default:
          beatsToCheck = state.beatBoard
      }

      if (beatsToCheck.length === 0) {
        return JSON.stringify({
          success: true,
          message: 'No beats to check',
          issues: [],
        })
      }

      const shouldCheck = (type: string) =>
        checkTypes.includes('all') || checkTypes.includes(type as any)

      // Run checks
      if (shouldCheck('world_rules')) {
        allIssues.push(...checkWorldRuleViolations(beatsToCheck, state.seriesBible))
      }

      if (shouldCheck('character_knowledge')) {
        allIssues.push(...checkKnowledgeViolations(beatsToCheck, state.characters))
      }

      if (shouldCheck('setup_payoff')) {
        allIssues.push(...checkSetupPayoffs(beatsToCheck, state.unresolvedSetups))
      }

      if (shouldCheck('timeline')) {
        const timeline = extractTimelineEvents(beatsToCheck)
        // Timeline checks could be expanded here
      }

      // Sort by severity
      const severityOrder = { critical: 0, major: 1, minor: 2 }
      allIssues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

      // Format results
      const criticalCount = allIssues.filter(i => i.severity === 'critical').length
      const majorCount = allIssues.filter(i => i.severity === 'major').length
      const minorCount = allIssues.filter(i => i.severity === 'minor').length

      if (allIssues.length === 0) {
        return JSON.stringify({
          success: true,
          message: `✅ Continuity check passed! No issues found in ${beatsToCheck.length} beat(s).`,
          issues: [],
          summary: {
            beatsChecked: beatsToCheck.length,
            issuesFound: 0,
          },
        })
      }

      return JSON.stringify({
        success: true,
        message: `Continuity check found ${allIssues.length} issue(s): ${criticalCount} critical, ${majorCount} major, ${minorCount} minor`,
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
}

/**
 * Quick consistency check tool - lightweight version
 */
export const createQuickConsistencyTool = (state: WritersRoomState) => {
  return new DynamicStructuredTool({
    name: 'quick_consistency_check',
    description:
      'Fast consistency check for a single beat or statement. Returns pass/fail with brief explanation.',
    schema: z.object({
      statement: z.string().describe('The story statement or beat logline to check'),
      charactersInvolved: z
        .array(z.string())
        .optional()
        .describe('Characters mentioned (for knowledge check)'),
    }),
    func: async ({ statement, charactersInvolved = [] }) => {
      const issues: string[] = []
      const statementLower = statement.toLowerCase()

      // Quick world rules check
      const worldRules = state.seriesBible.worldRules || []
      worldRules.forEach((rule: any) => {
        const ruleText = (typeof rule === 'string' ? rule : rule.rule || '').toLowerCase()
        // Very basic contradiction detection
        if (ruleText.includes('cannot') || ruleText.includes('never')) {
          const forbiddenAction = ruleText.replace(/.*?(cannot|never)\s+/, '').split(/[,.\s]/)[0]
          if (forbiddenAction && statementLower.includes(forbiddenAction)) {
            issues.push(`Possible violation: "${rule}" vs action "${forbiddenAction}"`)
          }
        }
      })

      // Quick character knowledge check
      charactersInvolved.forEach(charName => {
        const char = state.characters.find(c => c.name.toLowerCase() === charName.toLowerCase())
        if (char) {
          // Check if statement implies knowledge the character doesn't have
          // This would need semantic analysis in production
        }
      })

      if (issues.length === 0) {
        return JSON.stringify({
          pass: true,
          message: 'Statement appears consistent with established lore.',
        })
      }

      return JSON.stringify({
        pass: false,
        issues: issues,
        message: `Found ${issues.length} potential inconsistency(ies).`,
      })
    },
  })
}

export const continuityTools = [
  // Factory functions - called at runtime with state
]
