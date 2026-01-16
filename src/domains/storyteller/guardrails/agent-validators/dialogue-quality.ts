/**
 * Dialogue Quality Validator
 *
 * Validates dialogue for authenticity, avoiding exposition dumps
 * and ensuring natural speech patterns.
 */

import { ValidationResult, Validator } from '../runnable-guard'
import { WritersRoomState } from '../../graph/state'
import { GuardrailIssue } from '../types'

// ============================================
// DIALOGUE PATTERNS
// ============================================

interface DialogueLine {
  speaker?: string
  text: string
  lineNumber: number
}

interface DialogueIssue {
  type: string
  severity: 'error' | 'warning' | 'info'
  line: DialogueLine
  suggestion: string
}

// Patterns that indicate poor dialogue
const DIALOGUE_ANTIPATTERNS = {
  expositionDump: {
    patterns: [
      /as you (know|remember|recall)/i,
      /let me (explain|tell you)/i,
      /you see,\s/i,
      /the thing is,\s/i,
      /what you (need to|must|should) (know|understand)/i,
      /allow me to explain/i,
      /i should mention that/i,
      /for those who don't know/i,
    ],
    message: 'Exposition dump detected - characters explaining things they both already know',
    severity: 'warning' as const,
    suggestion: 'Show information through action or conflict instead',
  },

  onTheNose: {
    patterns: [
      /i (feel|am feeling) (so )?(happy|sad|angry|scared|excited)/i,
      /i'm (happy|sad|angry|scared|excited) (because|that)/i,
      /this makes me (feel )?(happy|sad|angry|scared|excited)/i,
      /my (feelings|emotions) (are|about)/i,
    ],
    message: 'On-the-nose dialogue - character directly stating their emotions',
    severity: 'warning' as const,
    suggestion: 'Show emotions through behavior, subtext, or physical reactions',
  },

  tooFormal: {
    patterns: [
      /i cannot|i am unable/i,
      /do not|will not|should not/i, // Should use contractions
      /i would like to|i wish to/i,
      /it is my (belief|opinion) that/i,
    ],
    // Only flag if repeated - some formal speech is fine
    minOccurrences: 3,
    message: 'Dialogue sounds overly formal - lacking contractions',
    severity: 'info' as const,
    suggestion: 'Use contractions (can\'t, don\'t, won\'t) for more natural speech',
  },

  speechifyning: {
    // Dialogue lines over 50 words
    isLongLine: true,
    wordThreshold: 50,
    message: 'Speech is too long - real people rarely speak in paragraphs',
    severity: 'warning' as const,
    suggestion: 'Break into shorter exchanges or interrupt with action/reaction',
  },

  genericGreetings: {
    patterns: [
      /^(hi|hello|hey),?\s*(how are you|nice to see you|good to see you)/i,
      /^(i'm|i am) (doing )?(fine|good|great|okay|well)/i,
    ],
    message: 'Generic greeting exchange - adds no value',
    severity: 'info' as const,
    suggestion: 'Start scenes in the middle of action, skip pleasantries',
  },

  nameOveruse: {
    // Character names used in dialogue more than once per exchange
    checkNameOveruse: true,
    message: 'Character names overused in dialogue - sounds unnatural',
    severity: 'info' as const,
    suggestion: 'People rarely use each other\'s names mid-conversation',
  },
}

// ============================================
// DIALOGUE EXTRACTION
// ============================================

function extractDialogue(content: string): DialogueLine[] {
  const lines: DialogueLine[] = []

  // Match standard screenplay format: CHARACTER\n"Dialogue" or CHARACTER: "Dialogue"
  const screenplayPattern = /^([A-Z][A-Z\s]+)(?:\s*\([^)]*\))?\s*\n(["']?)(.+?)\2(?:\n|$)/gm
  let match
  while ((match = screenplayPattern.exec(content)) !== null) {
    lines.push({
      speaker: match[1].trim(),
      text: match[3],
      lineNumber: content.substring(0, match.index).split('\n').length,
    })
  }

  // Match quoted dialogue
  const quotedPattern = /"([^"]+)"/g
  while ((match = quotedPattern.exec(content)) !== null) {
    // Avoid duplicates if already captured
    const alreadyCaptured = lines.some(l => l.text === match[1])
    if (!alreadyCaptured) {
      lines.push({
        text: match[1],
        lineNumber: content.substring(0, match.index).split('\n').length,
      })
    }
  }

  return lines
}

// ============================================
// VALIDATORS
// ============================================

function checkAntipatterns(lines: DialogueLine[]): DialogueIssue[] {
  const issues: DialogueIssue[] = []

  for (const line of lines) {
    // Check each antipattern type
    for (const [type, config] of Object.entries(DIALOGUE_ANTIPATTERNS)) {
      // Pattern-based checks
      if ('patterns' in config && config.patterns) {
        for (const pattern of config.patterns) {
          if (pattern.test(line.text)) {
            issues.push({
              type,
              severity: config.severity,
              line,
              suggestion: config.suggestion,
            })
            break // Only report once per type per line
          }
        }
      }

      // Long line check
      if ('isLongLine' in config && config.isLongLine) {
        const wordCount = line.text.split(/\s+/).length
        if (wordCount > (config as any).wordThreshold) {
          issues.push({
            type,
            severity: config.severity,
            line,
            suggestion: config.suggestion,
          })
        }
      }
    }
  }

  return issues
}

function checkNameOveruse(lines: DialogueLine[]): DialogueIssue[] {
  const issues: DialogueIssue[] = []

  // Collect all speaker names
  const speakers = new Set(lines.map(l => l.speaker).filter(Boolean))

  // Check if names appear too often in dialogue text
  for (const line of lines) {
    let nameCount = 0
    for (const speaker of speakers) {
      const regex = new RegExp(`\\b${speaker}\\b`, 'gi')
      const matches = line.text.match(regex)
      if (matches) nameCount += matches.length
    }

    if (nameCount > 1) {
      issues.push({
        type: 'nameOveruse',
        severity: 'info',
        line,
        suggestion: 'People rarely use each other\'s names repeatedly in conversation',
      })
    }
  }

  return issues
}

function checkContractionUsage(lines: DialogueLine[]): DialogueIssue[] {
  const issues: DialogueIssue[] = []

  // Count formal vs contracted forms across all dialogue
  let formalCount = 0
  let totalDialogueWords = 0

  const formalForms = [
    'cannot',
    'will not',
    'do not',
    'does not',
    'did not',
    'would not',
    'could not',
    'should not',
    'have not',
    'has not',
    'is not',
    'are not',
    'was not',
    'were not',
    'i am',
    'you are',
    'he is',
    'she is',
    'it is',
    'we are',
    'they are',
  ]

  for (const line of lines) {
    totalDialogueWords += line.text.split(/\s+/).length

    for (const form of formalForms) {
      const regex = new RegExp(`\\b${form}\\b`, 'gi')
      const matches = line.text.match(regex)
      if (matches) formalCount += matches.length
    }
  }

  // Flag if more than 30% of potentially contracted words are formal
  const contractionRatio = formalCount / Math.max(totalDialogueWords / 10, 1)
  if (contractionRatio > 0.3 && lines.length > 3) {
    issues.push({
      type: 'tooFormal',
      severity: 'info',
      line: lines[0], // Just reference first line
      suggestion: 'Consider using more contractions for natural dialogue',
    })
  }

  return issues
}

// ============================================
// MAIN VALIDATOR
// ============================================

export class DialogueQualityValidator implements Validator<Partial<WritersRoomState>> {
  name = 'DialogueQuality'

  async validate(output: Partial<WritersRoomState>): Promise<ValidationResult> {
    const guardIssues: GuardrailIssue[] = []

    // Extract content from last message
    const messages = output.messages || []
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage
      ? typeof lastMessage.content === 'string'
        ? lastMessage.content
        : ''
      : ''

    // Extract dialogue
    const dialogueLines = extractDialogue(content)

    // Skip if no dialogue found
    if (dialogueLines.length === 0) {
      return { isValid: true, issues: [] }
    }

    // Run all checks
    const dialogueIssues: DialogueIssue[] = [
      ...checkAntipatterns(dialogueLines),
      ...checkNameOveruse(dialogueLines),
      ...checkContractionUsage(dialogueLines),
    ]

    // Convert to GuardrailIssue format
    for (const issue of dialogueIssues) {
      guardIssues.push({
        code: `DIALOGUE_${issue.type.toUpperCase()}`,
        message: `${DIALOGUE_ANTIPATTERNS[issue.type as keyof typeof DIALOGUE_ANTIPATTERNS]?.message || issue.type}: "${issue.line.text.slice(0, 50)}..."`,
        severity: issue.severity,
        context: {
          lineNumber: issue.line.lineNumber,
          speaker: issue.line.speaker,
          suggestion: issue.suggestion,
        },
      })
    }

    // Dialogue issues are warnings, don't block
    return {
      isValid: true,
      issues: guardIssues,
    }
  }
}

/**
 * Factory function
 */
export function createDialogueQualityValidator(): DialogueQualityValidator {
  return new DialogueQualityValidator()
}
