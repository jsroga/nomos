/**
 * Beat Consistency Validator
 * 
 * Validates that story beats follow causality chains and maintain
 * logical consistency with established story elements.
 */

import { ValidationResult, Validator } from '../runnable-guard'
import { WritersRoomState } from '../../graph/state'
import { GuardrailIssue } from '../types'

// ============================================
// TYPES
// ============================================

interface BeatInfo {
  logline: string
  type?: string
  characters?: string[]
  location?: string
}

interface ConsistencyCheck {
  name: string
  check: (beat: BeatInfo, context: BeatContext) => ConsistencyResult
}

interface ConsistencyResult {
  passed: boolean
  issue?: string
  severity: 'error' | 'warning' | 'info'
}

interface BeatContext {
  previousBeats: BeatInfo[]
  characters: string[]
  locations: string[]
  establishedRules: string[]
}

// ============================================
// CONSISTENCY CHECKS
// ============================================

const CONSISTENCY_CHECKS: ConsistencyCheck[] = [
  {
    name: 'character-presence',
    check: (beat, context) => {
      // Check if characters in beat exist
      if (!beat.characters || beat.characters.length === 0) {
        return { passed: true, severity: 'info' }
      }
      
      const unknownCharacters = beat.characters.filter(
        c => !context.characters.some(
          known => known.toLowerCase() === c.toLowerCase()
        )
      )
      
      if (unknownCharacters.length > 0) {
        return {
          passed: false,
          issue: `Unknown characters: ${unknownCharacters.join(', ')}. They haven't been established.`,
          severity: 'warning',
        }
      }
      
      return { passed: true, severity: 'info' }
    },
  },
  
  {
    name: 'causality-chain',
    check: (beat, context) => {
      // Check if beat logically follows from previous beats
      const loglineLower = beat.logline.toLowerCase()
      
      // Detect sudden character knowledge
      const knowledgePatterns = [
        /suddenly (knows?|realizes?|discovers?)/i,
        /somehow (learned?|found out)/i,
        /inexplicably (aware|understands?)/i,
      ]
      
      for (const pattern of knowledgePatterns) {
        if (pattern.test(loglineLower)) {
          return {
            passed: false,
            issue: 'Beat implies sudden unexplained knowledge. Characters should learn information through established scenes.',
            severity: 'warning',
          }
        }
      }
      
      return { passed: true, severity: 'info' }
    },
  },
  
  {
    name: 'location-continuity',
    check: (beat, context) => {
      // Check for impossible location transitions
      if (!beat.location || context.previousBeats.length === 0) {
        return { passed: true, severity: 'info' }
      }
      
      const lastBeat = context.previousBeats[context.previousBeats.length - 1]
      if (!lastBeat.location) {
        return { passed: true, severity: 'info' }
      }
      
      // Flag instant transitions between distant locations
      const instantTransitionWords = ['meanwhile', 'at the same time', 'simultaneously']
      const hasInstantTransition = instantTransitionWords.some(
        word => beat.logline.toLowerCase().includes(word)
      )
      
      if (hasInstantTransition && lastBeat.location !== beat.location) {
        // This is fine - it's a parallel cut
        return { passed: true, severity: 'info' }
      }
      
      // TODO: Add more sophisticated location distance checking
      return { passed: true, severity: 'info' }
    },
  },
  
  {
    name: 'stakes-progression',
    check: (beat, context) => {
      // Warn if stakes seem to decrease without resolution
      const stakesKeywords = {
        high: ['death', 'destroy', 'doom', 'catastrophe', 'lose everything'],
        medium: ['danger', 'risk', 'threat', 'challenge', 'conflict'],
        low: ['minor', 'small', 'trivial', 'inconvenience'],
      }
      
      const loglineLower = beat.logline.toLowerCase()
      
      // Check if we're going from high to low stakes
      if (context.previousBeats.length > 0) {
        const lastBeat = context.previousBeats[context.previousBeats.length - 1]
        const lastLogline = lastBeat.logline.toLowerCase()
        
        const lastHadHighStakes = stakesKeywords.high.some(k => lastLogline.includes(k))
        const currentHasLowStakes = stakesKeywords.low.some(k => loglineLower.includes(k))
        
        if (lastHadHighStakes && currentHasLowStakes) {
          return {
            passed: true, // Don't block, just warn
            issue: 'Stakes appear to decrease significantly. Consider if this is intentional.',
            severity: 'info',
          }
        }
      }
      
      return { passed: true, severity: 'info' }
    },
  },
  
  {
    name: 'resolution-timing',
    check: (beat, context) => {
      // Warn about premature resolutions
      const resolutionPatterns = [
        /finally resolves?/i,
        /problem solved/i,
        /happy ending/i,
        /everything (works out|is fine)/i,
        /learns? (a valuable|an important) lesson/i,
      ]
      
      // Only flag if we're early in the beat sequence
      if (context.previousBeats.length < 5) {
        for (const pattern of resolutionPatterns) {
          if (pattern.test(beat.logline)) {
            return {
              passed: true,
              issue: 'Resolution seems premature. Consider building more conflict first.',
              severity: 'warning',
            }
          }
        }
      }
      
      return { passed: true, severity: 'info' }
    },
  },
]

// ============================================
// BEAT EXTRACTION
// ============================================

function extractBeatInfo(content: string): BeatInfo | null {
  // Try to extract beat information from content
  const beatMatch = content.match(/beat[:\s]+["']?(.+?)["']?(?:\n|$)/i)
  const loglineMatch = content.match(/logline[:\s]+["']?(.+?)["']?(?:\n|$)/i)
  
  const logline = beatMatch?.[1] || loglineMatch?.[1] || null
  
  if (!logline) return null
  
  // Extract characters mentioned
  const characterMatch = content.match(/characters?[:\s]+(.+?)(?:\n|$)/i)
  const characters = characterMatch 
    ? characterMatch[1].split(/[,;]/).map(c => c.trim())
    : []
  
  // Extract location
  const locationMatch = content.match(/location[:\s]+(.+?)(?:\n|$)/i)
  const location = locationMatch?.[1]?.trim()
  
  return {
    logline,
    characters,
    location,
  }
}

// ============================================
// VALIDATOR
// ============================================

export class BeatConsistencyValidator implements Validator<Partial<WritersRoomState>> {
  name = 'BeatConsistency'
  
  async validate(output: Partial<WritersRoomState>): Promise<ValidationResult> {
    const issues: GuardrailIssue[] = []
    
    // Extract content from last message
    const messages = output.messages || []
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage 
      ? (typeof lastMessage.content === 'string' ? lastMessage.content : '')
      : ''
    
    // Try to extract beat info
    const beatInfo = extractBeatInfo(content)
    
    if (!beatInfo) {
      // Not a beat-related message, skip validation
      return { isValid: true, issues: [] }
    }
    
    // Build context from state
    // TODO: Get this from actual state/series bible
    const context: BeatContext = {
      previousBeats: [],
      characters: [],
      locations: [],
      establishedRules: [],
    }
    
    // Run all consistency checks
    for (const check of CONSISTENCY_CHECKS) {
      const result = check.check(beatInfo, context)
      
      if (!result.passed || result.issue) {
        issues.push({
          code: `BEAT_${check.name.toUpperCase().replace('-', '_')}`,
          message: result.issue || `${check.name} check failed`,
          severity: result.severity,
          context: {
            checkName: check.name,
            beat: beatInfo,
          },
        })
      }
    }
    
    // Determine overall validity (errors block, warnings don't)
    const hasErrors = issues.some(i => i.severity === 'error')
    
    return {
      isValid: !hasErrors,
      issues,
    }
  }
}

/**
 * Factory function
 */
export function createBeatConsistencyValidator(): BeatConsistencyValidator {
  return new BeatConsistencyValidator()
}

