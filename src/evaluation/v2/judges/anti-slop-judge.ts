/**
 * Anti-Slop Judge
 *
 * Detects and penalizes AI-typical writing patterns, clichés, and filler.
 * "Slop" is writing that fills space without adding meaning - the linguistic
 * equivalent of empty calories.
 *
 * Common slop patterns:
 * - Hedging phrases: "It's important to note that...", "It's worth mentioning..."
 * - Filler: "In order to", "Due to the fact that", "At this point in time"
 * - Purple prose: Overwrought descriptions that try too hard
 * - Telling not showing: "She felt sad" instead of showing sadness
 * - AI-typical constructions: "I cannot help but wonder", "delve into"
 * - Redundancy: "She nodded her head" (what else would she nod?)
 * - Weak verbs: Overuse of "was", "had", "seemed", "appeared"
 * - Empty intensifiers: "very", "really", "quite", "extremely"
 * - Vague descriptions: Generic instead of specific details
 *
 * The goal: reward writing that is specific, direct, and purposeful.
 */

import { z } from 'zod'
import { BaseLangfuseJudge, buildContextSection } from '../base-langfuse-judge'
import { AntiSlopSchema, AntiSlopOutput, ScoreNames, StorytellerContext } from '../types'
import { langfuse, recordCreativeEvaluation } from '@/agent-core/observability'

// Known slop patterns for detection
export const SLOP_PATTERNS = {
  hedging: [
    "it's important to note",
    "it's worth mentioning",
    "it should be noted",
    "needless to say",
    "it goes without saying",
    "as you may know",
    "as we all know",
    "in my opinion",
    "i think that",
    "i believe that",
    "one might argue",
    "it could be said",
    "arguably",
  ],
  filler: [
    "in order to",
    "due to the fact that",
    "at this point in time",
    "at the end of the day",
    "when all is said and done",
    "first and foremost",
    "each and every",
    "in the event that",
    "for all intents and purposes",
    "in terms of",
    "with regard to",
    "in relation to",
    "the fact that",
    "basically",
    "essentially",
    "actually",
    "literally",
    "honestly",
  ],
  ai_patterns: [
    "i cannot help but",
    "it's fascinating",
    "delve into",
    "dive into",
    "embark on",
    "navigate the",
    "tapestry of",
    "myriad of",
    "plethora of",
    "in the realm of",
    "the intricacies of",
    "nuanced",
    "multifaceted",
    "paradigm",
    "synergy",
    "leverage",
    "holistic",
    "robust",
    "cutting-edge",
    "game-changing",
    "unlock",
    "unpack",
    "landscape",
    "ecosystem",
  ],
  purple_prose: [
    "orbs", // instead of eyes
    "crimson liquid", // instead of blood
    "onyx tresses", // instead of black hair
    "alabaster skin",
    "pools of",
    "cascading",
    "glistening",
    "resplendent",
    "effervescent",
    "luminous",
    "ethereal",
    "gossamer",
  ],
  weak_constructions: [
    "there was",
    "there were",
    "it was",
    "she was",
    "he was",
    "they were",
    "seemed to",
    "appeared to",
    "began to",
    "started to",
    "proceeded to",
    "managed to",
    "was able to",
  ],
  empty_intensifiers: [
    " very ",
    " really ",
    " quite ",
    " extremely ",
    " incredibly ",
    " absolutely ",
    " totally ",
    " completely ",
    " utterly ",
  ],
  redundancy: [
    "nodded her head",
    "nodded his head",
    "shrugged her shoulders",
    "shrugged his shoulders",
    "sat down",
    "stood up",
    "thought to herself",
    "thought to himself",
    "smiled to herself",
    "smiled to himself",
    "completely destroyed",
    "totally annihilated",
    "past history",
    "future plans",
    "true fact",
    "completely finished",
    "end result",
  ],
}

export class AntiSlopJudge extends BaseLangfuseJudge<AntiSlopOutput> {
  name = 'AntiSlopJudge'
  scoreName = ScoreNames.ANTI_SLOP

  protected getOutputSchema(): z.ZodType<AntiSlopOutput> {
    return AntiSlopSchema
  }

  protected extractScore(parsed: AntiSlopOutput): number {
    return parsed.overallAntiSlop
  }

  protected extractReasoning(parsed: AntiSlopOutput): string {
    const slopCount = parsed.slopInstances.length
    const severeCount = parsed.slopInstances.filter(s => s.severity === 'severe').length

    if (slopCount === 0) {
      return `${parsed.critique} Clean writing with no significant slop detected.`
    }

    return `${parsed.critique} Found ${slopCount} slop instance(s)${severeCount > 0 ? ` (${severeCount} severe)` : ''}. Slop density: ${parsed.slopDensity.toFixed(1)} per 100 words.`
  }

  protected buildPrompt(
    input: string,
    output: string,
    context?: StorytellerContext,
  ): string {
    // Pre-scan for pattern matches to include in prompt
    const patternMatches = this.preScanPatterns(output)

    return `You are evaluating creative writing for SLOP - empty, filler, cliché writing that AI often produces.

SLOP CATEGORIES:

1. HEDGING - Phrases that qualify without purpose
   Bad: "It's important to note that the door was locked."
   Good: "The door was locked."

2. FILLER - Words/phrases that add nothing
   Bad: "In order to escape, she had to find the key."
   Good: "To escape, she needed the key."

3. AI PATTERNS - Distinctly AI-sounding constructions
   Bad: "I cannot help but wonder about the tapestry of emotions."
   Good: "I wonder what she's feeling."

4. PURPLE PROSE - Overwrought description
   Bad: "Her orbs of cerulean glistened with unshed crystalline tears."
   Good: "Her blue eyes were wet."

5. TELLING NOT SHOWING
   Bad: "She felt incredibly sad and depressed about the situation."
   Good: "She stared at the wall, the coffee growing cold in her hands."

6. REDUNDANCY - Saying the same thing twice
   Bad: "He nodded his head in agreement, agreeing with her statement."
   Good: "He nodded."

7. WEAK VERBS - Passive, limp constructions
   Bad: "There was a loud noise that seemed to come from upstairs."
   Good: "Something crashed upstairs."

8. EMPTY INTENSIFIERS - "Very", "really", etc.
   Bad: "She was very, very tired and extremely hungry."
   Good: "She was exhausted and starving."

9. VAGUE DESCRIPTIONS - Generic instead of specific
   Bad: "The room was nice with some furniture."
   Good: "The room had a leather couch, a water-stained coffee table, and a TV from the 90s."

${patternMatches.length > 0 ? `\nPOTENTIAL PATTERNS DETECTED (verify these):\n${patternMatches.map(p => `- "${p}"`).join('\n')}\n` : ''}

CONTENT TO EVALUATE:
${output}

Analyze this content for slop. For each instance:
1. Quote the exact slop
2. Categorize it
3. Rate severity (minor/moderate/severe)
4. Suggest a fix if applicable

Then score the overall quality:
- Clarity: How direct and clear is the writing?
- Specificity: How specific vs generic?
- Voice: How distinctive vs generic AI voice?
- Economy: Does every word earn its place?

A score of 80+ means clean, professional writing.
A score of 60-80 has some slop but is generally good.
A score of 40-60 has notable slop issues.
A score below 40 is slop-heavy writing.

Respond with JSON:
{
  "slopInstances": [
    {
      "text": "<exact quote>",
      "category": "hedging" | "filler" | "cliche_phrase" | "purple_prose" | "telling_not_showing" | "ai_pattern" | "redundancy" | "weak_verbs" | "empty_intensifier" | "vague_description",
      "severity": "minor" | "moderate" | "severe",
      "suggestion": "<how to fix, optional>"
    }
  ],
  "clarityScore": <0-100>,
  "specificityScore": <0-100>,
  "voiceScore": <0-100>,
  "economyScore": <0-100>,
  "overallAntiSlop": <0-100>,
  "slopDensity": <instances per 100 words>,
  "critique": "<honest assessment>"
}`
  }

  /**
   * Pre-scan text for known slop patterns
   */
  private preScanPatterns(text: string): string[] {
    const found: string[] = []
    const lowerText = text.toLowerCase()

    for (const [category, patterns] of Object.entries(SLOP_PATTERNS)) {
      for (const pattern of patterns) {
        if (lowerText.includes(pattern.toLowerCase())) {
          // Find the actual text with surrounding context
          const index = lowerText.indexOf(pattern.toLowerCase())
          const start = Math.max(0, index - 20)
          const end = Math.min(text.length, index + pattern.length + 20)
          const context = text.slice(start, end).replace(/\n/g, ' ').trim()
          found.push(`[${category}] ...${context}...`)
        }
      }
    }

    return found.slice(0, 10) // Limit to 10 to not overwhelm
  }

  protected calculateConfidence(parsed: AntiSlopOutput): number {
    // Higher confidence with more instances found
    const instanceCount = parsed.slopInstances.length
    if (instanceCount > 5) return 0.9
    if (instanceCount > 0) return 0.85
    return 0.75 // Slightly lower if nothing found (might have missed things)
  }

  /**
   * Record all anti-slop sub-dimension scores to Langfuse
   * Per scientific evaluation guide dimensions:
   * - clarityScore, specificityScore, voiceScore, economyScore
   */
  protected recordSubScores(traceId: string, parsed: AntiSlopOutput): void {
    recordCreativeEvaluation(traceId, {
      antiSlop: {
        overall: parsed.overallAntiSlop,
        clarityScore: parsed.clarityScore,
        specificityScore: parsed.specificityScore,
        voiceScore: parsed.voiceScore,
        economyScore: parsed.economyScore,
      },
    }, parsed.critique)
    
    // Also record slop density as a separate metric
    langfuse.score({
      traceId,
      name: 'slop_density',
      value: Math.min(parsed.slopDensity / 10, 1), // Normalize: 10+ per 100 words = 1.0
      dataType: 'NUMERIC',
      comment: `${parsed.slopDensity.toFixed(1)} slop instances per 100 words`,
      id: `${traceId}-slop_density`,
    })
  }
}

/**
 * Specialized judge for detecting AI voice patterns
 */
export class AuthenticityJudge extends BaseLangfuseJudge<{
  humanLikelihood: number
  aiPatternCount: number
  distinctiveVoice: number
  patterns: Array<{ text: string; pattern: string; confidence: number }>
  critique: string
}> {
  name = 'AuthenticityJudge'
  scoreName = ScoreNames.AUTHENTICITY

  protected getOutputSchema() {
    return z.object({
      humanLikelihood: z.number().min(0).max(100),
      aiPatternCount: z.number(),
      distinctiveVoice: z.number().min(0).max(100),
      patterns: z.array(z.object({
        text: z.string(),
        pattern: z.string(),
        confidence: z.number().min(0).max(1),
      })),
      critique: z.string(),
    })
  }

  protected extractScore(parsed: any): number {
    // Combine human likelihood and voice distinctiveness
    return (parsed.humanLikelihood * 0.6 + parsed.distinctiveVoice * 0.4)
  }

  protected extractReasoning(parsed: any): string {
    return `${parsed.critique} Human likelihood: ${parsed.humanLikelihood}%. AI patterns: ${parsed.aiPatternCount}.`
  }

  protected buildPrompt(
    input: string,
    output: string,
  ): string {
    return `You are evaluating whether creative writing sounds AUTHENTICALLY HUMAN vs AI-GENERATED.

AI writing tends to:
- Use certain phrases repeatedly ("delve into", "tapestry", "myriad")
- Be overly balanced and hedged
- Avoid strong opinions or voice
- Have perfect grammar but lack personality
- Use filler to meet length requirements
- Sound like it's trying to sound smart

Human writing tends to:
- Have distinctive voice and quirks
- Take risks and strong positions
- Have natural imperfections
- Include specific, unexpected details
- Show personality through word choice
- Break rules purposefully

CONTENT TO EVALUATE:
${output}

Assess:
1. Does this sound like a specific person wrote it, or "generic AI"?
2. Are there distinctively human touches?
3. Are there telltale AI patterns?
4. Would this pass as human-written in a blind test?

Respond with JSON:
{
  "humanLikelihood": <0-100, how likely a human wrote this>,
  "aiPatternCount": <number of AI-typical patterns found>,
  "distinctiveVoice": <0-100, how distinctive/unique the voice is>,
  "patterns": [
    {"text": "<quote>", "pattern": "<what AI pattern>", "confidence": <0-1>}
  ],
  "critique": "<assessment>"
}`
  }
}

/**
 * Specialized judge for cliché detection
 */
export class ClicheJudge extends BaseLangfuseJudge<{
  clicheDensity: number
  cliches: Array<{
    text: string
    type: 'phrase' | 'plot' | 'character' | 'setting' | 'dialogue'
    staleness: number
  }>
  freshness: number
  critique: string
}> {
  name = 'ClicheJudge'
  scoreName = ScoreNames.CLICHE_DENSITY

  protected getOutputSchema() {
    return z.object({
      clicheDensity: z.number(),
      cliches: z.array(z.object({
        text: z.string(),
        type: z.enum(['phrase', 'plot', 'character', 'setting', 'dialogue']),
        staleness: z.number().min(1).max(10),
      })),
      freshness: z.number().min(0).max(100),
      critique: z.string(),
    })
  }

  protected extractScore(parsed: any): number {
    return parsed.freshness
  }

  protected extractReasoning(parsed: any): string {
    const clicheCount = parsed.cliches.length
    return `${parsed.critique} Found ${clicheCount} cliché(s). Freshness: ${parsed.freshness}%.`
  }

  protected buildPrompt(
    input: string,
    output: string,
  ): string {
    return `You are evaluating creative writing for CLICHÉS - overused phrases, tropes, and patterns.

CLICHÉ TYPES:

1. PHRASE CLICHÉS
   - "Her heart raced"
   - "A chill ran down his spine"
   - "Time stood still"
   - "Little did they know"

2. PLOT CLICHÉS
   - Chosen one prophecy
   - Love triangle
   - Dead mentor motivation
   - "It was all a dream"

3. CHARACTER CLICHÉS
   - Grizzled detective with a dark past
   - Quirky best friend
   - Evil stepmother
   - Secretly noble criminal

4. SETTING CLICHÉS
   - Dark and stormy night
   - Abandoned warehouse
   - Generic medieval fantasy village
   - Dystopian grey cityscape

5. DIALOGUE CLICHÉS
   - "We've got company"
   - "I've got a bad feeling about this"
   - "You just don't get it"
   - "This ends now"

CONTENT TO EVALUATE:
${output}

Find the clichés. Rate each for staleness (1=slight, 10=eye-rollingly stale).
Score overall freshness - how original vs derivative is this?

Respond with JSON:
{
  "clicheDensity": <clichés per 100 words>,
  "cliches": [
    {"text": "<the cliché>", "type": "phrase" | "plot" | "character" | "setting" | "dialogue", "staleness": <1-10>}
  ],
  "freshness": <0-100, inverse of cliché-ness>,
  "critique": "<assessment>"
}`
  }
}
