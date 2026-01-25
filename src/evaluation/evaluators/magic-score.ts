/**
 * Magic Score Evaluator - Anti-AI-Slop Detection
 *
 * Sophisticated detection of generic, predictable AI outputs.
 * Combines statistical analysis, structural patterns, and semantic evaluation.
 */

import { ChatAnthropic } from '@langchain/anthropic'
import { CustomEvaluator, EvaluatorInput, EvaluatorResult } from '../types'

// ============================================
// TYPES
// ============================================

export interface MagicScoreResult {
  overallMagic: number // 0-100
  dimensions: {
    // Heuristic dimensions
    lexicalDiversity: number // Vocabulary richness
    structuralUnpredictability: number // Non-formulaic structure
    dialogueAuthenticity: number // Real speech patterns
    emotionalSpecificity: number // Specific vs generic emotions
    // LLM-evaluated dimensions (George RR Martin style)
    conceptualOriginality: number // Fresh ideas vs derivative
    characterSpecificity: number // Memorable vs archetypal
    proseVoice: number // Distinctive vs generic
    riskTaking: number // Bold choices vs safe
    memorability: number // Haunting vs forgettable
    worldBuildingDepth: number // Lived-in vs wallpaper
    characterVoiceDistinction: number // Unique voices vs interchangeable
    subtextQuality: number // Layered vs on-the-nose
    unexpectedChoices: number // Surprising vs predictable
  }
  slopIndicators: SlopIndicator[]
  creativeSparks: string[]
  confidence: number
}

interface SlopIndicator {
  type: 'lexical' | 'structural' | 'semantic' | 'dialogue' | 'emotional'
  severity: 'critical' | 'warning' | 'minor'
  evidence: string
  suggestion: string
}


// ============================================
// SEMANTIC ORIGINALITY (LLM-as-Judge)
// ============================================

const MAGIC_JUDGE_PROMPT = `You are a ruthless creative writing critic channeling George R.R. Martin, Ursula K. Le Guin, and Cormac McCarthy. You DESPISE generic AI-generated content with the passion of a thousand burning suns.

Your sacred duty: Identify what makes writing feel ALIVE (like A Song of Ice and Fire) versus DEAD/FORMULAIC (like soulless AI slop).

## Evaluate This Content:

{content}

## Score These Dimensions (0-100, be MERCILESS):

### 1. CONCEPTUAL ORIGINALITY
- 0-20: Derivative, seen-it-before ideas. "Chosen one" tropes. Good vs Evil binaries.
- 30-50: Some fresh elements, mostly conventional fantasy/drama beats
- 60-80: Genuinely interesting concepts, unexpected combinations, subverted expectations
- 90-100: Truly original - makes you think "I've never seen this angle before"

### 2. CHARACTER SPECIFICITY
- 0-20: Could be any character from any story. No inner contradictions.
- 30-50: Some distinctive traits, mostly archetypal (the mentor, the villain, the hero)
- 60-80: Memorable, specific details that MATTER. Flaws that inform decisions.
- 90-100: Unforgettable - contradictory, deeply human, morally complex like Jaime Lannister or Tyrion

### 3. PROSE VOICE
- 0-20: Generic "AI voice" - safe, balanced, predictable. "The tension was palpable."
- 30-50: Some personality, but could be anyone. Serviceable but forgettable.
- 60-80: Distinctive style - author would be recognizable. Rhythm and cadence unique.
- 90-100: Voice so strong it could only be this writer - like McCarthy's sparse brutality or Le Guin's anthropological precision

### 4. RISK-TAKING
- 0-20: Plays it safe at every turn. Good guys win. Love conquers all.
- 30-50: Occasional bold choices buried in safety nets
- 60-80: Commits to interesting choices, accepts consequences. Characters die when they should.
- 90-100: Fearless - makes choices that could alienate readers but land. The Red Wedding energy.

### 5. MEMORABILITY
- 0-20: Forgettable, would not remember next week. Generic battles and reunions.
- 30-50: Some moments stick, overall hazy
- 60-80: Several memorable images/moments that linger
- 90-100: Haunting - will think about this for days. "The North Remembers" level iconography.

### 6. WORLD-BUILDING DEPTH
- 0-20: Generic fantasy/sci-fi wallpaper. Could be any setting.
- 30-50: Some unique elements, mostly familiar tropes
- 60-80: Lived-in world with history, economics, cultural logic. Iceberg worldbuilding.
- 90-100: World feels as real as our own - every detail reveals deeper systems

### 7. CHARACTER VOICE DISTINCTION
- 0-20: All characters sound the same. Interchangeable dialogue.
- 30-50: Some variation in speech patterns
- 60-80: Could identify speaker without attribution. Class, education, region show.
- 90-100: Each character has utterly unique vocabulary, rhythm, worldview in their speech

### 8. SUBTEXT QUALITY
- 0-20: Everything is said explicitly. No layers. Characters announce their feelings.
- 30-50: Occasional implication, mostly on-the-nose
- 60-80: Rich subtext - what's NOT said matters. Tension in silence.
- 90-100: Multiple layers of meaning. Dialogue doing triple duty.

### 9. UNEXPECTED CHOICES
- 0-20: Every beat predictable. Setup → expected payoff.
- 30-50: Occasional surprises, mostly conventional
- 60-80: Genuine subversions that still feel earned. Expectations upended.
- 90-100: Constantly surprising yet inevitable in retrospect. "Of course it had to happen this way."

## Also List:
- **CREATIVE SPARKS**: Specific moments that surprised you or felt genuinely creative (quote them)
- **SLOP ALERTS**: Specific phrases/moments that scream "AI generated this" (quote them)
- **WHAT WOULD GRRM DO**: One specific suggestion in the style of George R.R. Martin to increase quality

Respond with JSON only:
{
  "conceptualOriginality": 45,
  "characterSpecificity": 30,
  "proseVoice": 25,
  "riskTaking": 20,
  "memorability": 35,
  "worldBuildingDepth": 40,
  "characterVoiceDistinction": 35,
  "subtextQuality": 30,
  "unexpectedChoices": 25,
  "creativeSparks": ["list of specific moments with quotes"],
  "slopAlerts": ["list of generic/AI moments with quotes"],
  "improvementSuggestion": "specific suggestion in GRRM style"
}`

async function runSemanticAnalysis(content: string): Promise<{
  scores: {
    conceptualOriginality: number
    characterSpecificity: number
    proseVoice: number
    riskTaking: number
    memorability: number
    worldBuildingDepth: number
    characterVoiceDistinction: number
    subtextQuality: number
    unexpectedChoices: number
  }
  creativeSparks: string[]
  slopAlerts: string[]
  suggestion: string
} | null> {
  try {
    // Use Claude Opus 4.5 for the highest quality evaluation
    const model = new ChatAnthropic({
      modelName: 'claude-opus-4-5-20251101',
      temperature: 0.3, // Low temperature for consistent, rigorous critique
      maxRetries: 2,
    })

    const prompt = MAGIC_JUDGE_PROMPT.replace('{content}', content.slice(0, 8000))
    const response = await model.invoke(prompt)
    const responseText =
      typeof response.content === 'string' ? response.content : JSON.stringify(response.content)

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])

    return {
      scores: {
        conceptualOriginality: parsed.conceptualOriginality || 50,
        characterSpecificity: parsed.characterSpecificity || 50,
        proseVoice: parsed.proseVoice || 50,
        riskTaking: parsed.riskTaking || 50,
        memorability: parsed.memorability || 50,
        worldBuildingDepth: parsed.worldBuildingDepth || 50,
        characterVoiceDistinction: parsed.characterVoiceDistinction || 50,
        subtextQuality: parsed.subtextQuality || 50,
        unexpectedChoices: parsed.unexpectedChoices || 50,
      },
      creativeSparks: parsed.creativeSparks || [],
      slopAlerts: parsed.slopAlerts || [],
      suggestion: parsed.improvementSuggestion || '',
    }
  } catch (error) {
    console.error('Semantic analysis failed:', error)
    return null
  }
}

// ============================================
// MAIN EVALUATOR
// ============================================

export const magicScoreEvaluator: CustomEvaluator = {
  name: 'magic-score',

  evaluate: async ({ output }: EvaluatorInput): Promise<EvaluatorResult> => {
    const content =
      typeof output === 'string' ? output : (output as any).response || JSON.stringify(output)

    if (content.length < 100) {
      return {
        score: 0.5,
        reasoning: 'Content too short for magic score evaluation',
        metadata: { skipped: true },
      }
    }

    // Run LLM semantic analysis (REQUIRED - no heuristic fallback)
    const semantic = await runSemanticAnalysis(content)

    // LLM evaluation is REQUIRED - no heuristic fallback
    if (!semantic) {
      return {
        score: 0,
        reasoning: 'LLM evaluation failed - ANTHROPIC_API_KEY not configured',
        metadata: {
          error: true,
          message: 'Semantic analysis requires ANTHROPIC_API_KEY',
          skipped: false
        },
      }
    }

    // Calculate dimension scores (LLM-only, no heuristics)
    const dimensions = {
      conceptualOriginality: semantic.scores.conceptualOriginality,
      characterSpecificity: semantic.scores.characterSpecificity,
      proseVoice: semantic.scores.proseVoice,
      riskTaking: semantic.scores.riskTaking,
      memorability: semantic.scores.memorability,
      worldBuildingDepth: semantic.scores.worldBuildingDepth,
      characterVoiceDistinction: semantic.scores.characterVoiceDistinction,
      subtextQuality: semantic.scores.subtextQuality,
      unexpectedChoices: semantic.scores.unexpectedChoices,
    }

    // Calculate overall magic score from LLM evaluation only
    const overallMagic =
      (semantic.scores.conceptualOriginality +
        semantic.scores.characterSpecificity +
        semantic.scores.proseVoice +
        semantic.scores.riskTaking +
        semantic.scores.memorability +
        semantic.scores.worldBuildingDepth +
        semantic.scores.characterVoiceDistinction +
        semantic.scores.subtextQuality +
        semantic.scores.unexpectedChoices) /
      9

    // Generate reasoning from LLM analysis
    const creativeSparks = semantic.creativeSparks
    const slopAlerts = semantic.slopAlerts

    const reasoning =
      overallMagic >= 70
        ? `Strong creative work. Magic: ${overallMagic.toFixed(0)}. Sparks: ${creativeSparks.slice(0, 2).join(', ') || 'N/A'}`
        : overallMagic >= 50
          ? `Average creativity. Magic: ${overallMagic.toFixed(0)}. Issues: ${slopAlerts.slice(0, 2).join('; ') || 'N/A'}`
          : `AI slop detected. Magic: ${overallMagic.toFixed(0)}. Critical issues: ${slopAlerts.join('; ') || 'N/A'}`

    return {
      score: overallMagic / 100,
      reasoning,
      metadata: {
        overallMagic,
        dimensions,
        creativeSparks,
        slopAlerts,
        suggestion: semantic.suggestion,
        evaluatedBy: 'claude-opus-4-5-20251101',
        threshold: 60,
      },
    }
  },
}


// ============================================
// GUARDRAIL VALIDATOR
// ============================================

import { ValidationResult, Validator } from '@/domains/storyteller/guardrails/runnable-guard'
import { WritersRoomState } from '@/domains/storyteller/graph/state'

/**
 * Anti-Slop Validator for use in RunnableGuard
 * Blocks output when AI slop is detected (threshold: 60)
 * REQUIRES ANTHROPIC_API_KEY - no heuristic fallback
 */
export class AntiSlopValidator implements Validator<Partial<WritersRoomState>> {
  name = 'AntiSlop'
  threshold: number
  blockOnCritical: boolean

  constructor(threshold = 60, blockOnCritical = true) {
    // Below 60 = too sloppy for George RR Martin standards
    this.threshold = threshold
    this.blockOnCritical = blockOnCritical
  }

  async validate(output: Partial<WritersRoomState>): Promise<ValidationResult> {
    // Extract content to check
    const messages = output.messages || []
    const lastMessage = messages[messages.length - 1]
    const content = lastMessage
      ? typeof lastMessage.content === 'string'
        ? lastMessage.content
        : ''
      : ''

    if (content.length < 100) {
      return { isValid: true, issues: [] }
    }

    // Run LLM-based evaluation (requires ANTHROPIC_API_KEY)
    const result = await magicScoreEvaluator.evaluate({
      input: {},
      output: { response: content },
    })

    // If evaluation failed (no API key), skip validation
    if ((result.metadata as any)?.error) {
      console.warn('AntiSlopValidator: Skipping - ANTHROPIC_API_KEY not configured')
      return { isValid: true, issues: [] }
    }

    const magicScore = (result.metadata as any)?.overallMagic || 0

    if (magicScore < this.threshold) {
      const isCritical = magicScore < 40 // Below 40 is critical slop
      return {
        isValid: !this.blockOnCritical || !isCritical,
        issues: [
          {
            code: 'AI_SLOP_DETECTED',
            message: `Low creativity score (${magicScore.toFixed(0)}/100, threshold: ${this.threshold}). Content needs more originality, character depth, and subtext.`,
            severity: isCritical ? 'error' : 'warning',
            context: result.metadata,
          },
        ],
      }
    }

    return { isValid: true, issues: [] }
  }
}
