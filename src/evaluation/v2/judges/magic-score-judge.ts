/**
 * Magic Score Judge
 *
 * Evaluates writing for "magic" - those human beautiful moments that are
 * currently hard for AI to generate but represent the pinnacle of storytelling.
 *
 * Inspired by:
 * - Red Dead Redemption 2's ending (Arthur's last ride, "I gave you all I had")
 * - The Witcher 3's quieter moments (Bloody Baron questline, Priscilla's song)
 * - Breaking Bad's face-offs (Crawl Space, Ozymandias)
 * - Better Call Saul's chicanery (Howard's death, Jimmy's confession)
 * - George R.R. Martin's unexpected humanity in violence
 * - Vince Gilligan's operatic tragedy
 *
 * The goal: identify and score moments that stay with you.
 */

import { z } from 'zod'
import { BaseLangfuseJudge, buildContextSection } from '../base-langfuse-judge'
import { MagicScoreSchema, MagicScoreOutput, ScoreNames, StorytellerContext } from '../types'
import { langfuse, recordCreativeEvaluation } from '@/agent-core/observability'

export class MagicScoreJudge extends BaseLangfuseJudge<MagicScoreOutput> {
  name = 'MagicScoreJudge'
  scoreName = ScoreNames.MAGIC_SCORE

  protected getOutputSchema(): z.ZodType<MagicScoreOutput> {
    return MagicScoreSchema
  }

  protected extractScore(parsed: MagicScoreOutput): number {
    return parsed.overallMagic
  }

  protected extractReasoning(parsed: MagicScoreOutput): string {
    const sparkSummary = parsed.sparks.length > 0
      ? `Found ${parsed.sparks.length} magic moments (highest impact: ${Math.max(...parsed.sparks.map(s => s.impact))}/10).`
      : 'No standout magic moments identified.'

    const evokesSummary = parsed.evokes.length > 0
      ? `Evokes: ${parsed.evokes.slice(0, 3).join(', ')}.`
      : ''

    return `${parsed.critique} ${sparkSummary} ${evokesSummary}`.trim()
  }

  /**
   * Record all magic score sub-dimensions to Langfuse
   * Per scientific evaluation guide dimensions:
   * - emotionalTruth, unexpectedBeauty, characterRevelation, thematicResonance, lingering
   */
  protected recordSubScores(traceId: string, parsed: MagicScoreOutput): void {
    recordCreativeEvaluation(traceId, {
      magic: {
        overall: parsed.overallMagic,
        emotionalTruth: parsed.emotionalTruth,
        unexpectedBeauty: parsed.unexpectedBeauty,
        characterRevelation: parsed.characterRevelation,
        thematicResonance: parsed.thematicResonance,
        lingering: parsed.lingering,
      },
    }, parsed.critique)
    
    // Also record categorical "has_magic_moments" score
    if (parsed.sparks.length > 0) {
      langfuse.score({
        traceId,
        name: 'has_magic_moments',
        value: 1,
        dataType: 'BOOLEAN',
        comment: `Found ${parsed.sparks.length} magic moments`,
        id: `${traceId}-has_magic_moments`,
      })
    }
  }

  protected buildPrompt(
    input: string,
    output: string,
    context?: StorytellerContext,
    expected?: string
  ): string {
    const contextSection = buildContextSection(context)

    return `You are evaluating creative writing for MAGIC - those rare, beautiful human moments that stick with readers/players long after they finish.

These are moments like:
- Arthur Morgan's last ride in Red Dead 2, "I gave you all I had, Dutch"
- Walter White saying "I am the one who knocks" or crawling in defeat in Crawl Space
- The Bloody Baron's tragedy in Witcher 3 - a monster who's also a broken man
- Howard Hamlin's random, senseless death in Better Call Saul
- The Red Wedding's brutality and silence after
- Joel's lie at the end of The Last of Us

What makes these magical:
1. EMOTIONAL TRUTH - The feeling is earned, not manipulated
2. UNEXPECTED BEAUTY - Grace in unexpected places
3. CHARACTER REVELATION - We see who someone truly is
4. THEMATIC RESONANCE - The moment echoes larger truths
5. LINGERING POWER - It stays with you

${contextSection}

USER REQUEST:
${input}

CONTENT TO EVALUATE:
${output}

${expected ? `REFERENCE (what great would look like):\n${expected}\n` : ''}

Evaluate this content for magic. Look for:
1. Moments that feel genuinely human and earned
2. Lines that could become memorable quotes
3. Character actions that reveal deep truth
4. Unexpected tenderness or brutality
5. Thematic echoes that amplify meaning
6. Anything that made you pause or feel something

Be honest - most writing doesn't achieve magic, and that's okay. Score the full range.
A score of 30-40 is competent writing.
A score of 50-60 has flashes of something special.
A score of 70+ has genuine magic moments.
A score of 90+ is rare - reserved for writing that could stand alongside the masters.

Respond with JSON matching this schema:
{
  "emotionalTruth": <0-100>,
  "unexpectedBeauty": <0-100>,
  "characterRevelation": <0-100>,
  "thematicResonance": <0-100>,
  "lingering": <0-100>,
  "sparks": [
    {
      "quote": "<exact quote from the text>",
      "type": "emotional_truth" | "unexpected_beauty" | "character_revelation" | "thematic_echo" | "haunting",
      "impact": <1-10>,
      "explanation": "<why this works>"
    }
  ],
  "evokes": ["<what great works this reminds you of>"],
  "overallMagic": <0-100>,
  "critique": "<honest assessment of what works and what doesn't>"
}`
  }

  protected calculateConfidence(parsed: MagicScoreOutput): number {
    // Higher confidence if we found specific sparks
    const sparkCount = parsed.sparks.length
    if (sparkCount >= 3) return 0.9
    if (sparkCount >= 1) return 0.8
    return 0.7
  }
}

/**
 * Specialized judge for emotional resonance specifically
 */
export class EmotionalResonanceJudge extends BaseLangfuseJudge<{
  resonance: number
  authenticity: number
  manipulation: number
  earned: boolean
  moments: Array<{ text: string; emotion: string; intensity: number }>
  critique: string
}> {
  name = 'EmotionalResonanceJudge'
  scoreName = ScoreNames.EMOTIONAL_RESONANCE

  protected getOutputSchema() {
    return z.object({
      resonance: z.number().min(0).max(100),
      authenticity: z.number().min(0).max(100),
      manipulation: z.number().min(0).max(100),
      earned: z.boolean(),
      moments: z.array(z.object({
        text: z.string(),
        emotion: z.string(),
        intensity: z.number().min(1).max(10),
      })),
      critique: z.string(),
    })
  }

  protected extractScore(parsed: any): number {
    // Penalize manipulation, reward authenticity
    const base = parsed.resonance
    const authenticityBonus = (parsed.authenticity - 50) * 0.2
    const manipulationPenalty = parsed.manipulation * 0.3
    return Math.max(0, base + authenticityBonus - manipulationPenalty)
  }

  protected extractReasoning(parsed: any): string {
    const earnedText = parsed.earned ? 'Emotions feel earned.' : 'Emotions feel forced or manipulated.'
    return `${parsed.critique} ${earnedText}`
  }

  protected buildPrompt(
    input: string,
    output: string,
    context?: StorytellerContext,
  ): string {
    return `You are evaluating creative writing for EMOTIONAL RESONANCE.

The key distinction: EARNED vs MANIPULATED emotion.

EARNED emotion:
- Builds naturally from character and situation
- Doesn't tell us what to feel
- Trusts the reader
- Has setup and payoff
- Feels inevitable in hindsight

MANIPULATED emotion:
- Uses cheap tricks (dead kids, pets, etc.)
- Tells us "this is sad" or "this is scary"
- Piles on without purpose
- No proper setup
- Feels arbitrary

Examples of EARNED:
- Brooks's suicide in Shawshank - we understand why
- Boromir's death - his arc completes
- "That's the way it is" - Arthur's whole journey leads here

Examples of MANIPULATED:
- Random character death for shock value
- Sad music + rain = sad scene
- Characters crying = you should cry

CONTENT TO EVALUATE:
${output}

Evaluate for emotional resonance. Consider:
1. Are emotions built up or dumped on us?
2. Do character actions drive emotional moments?
3. Is there subtext or just text?
4. Would this work without a swelling soundtrack?
5. Does it trust the audience?

Respond with JSON:
{
  "resonance": <0-100, overall emotional impact>,
  "authenticity": <0-100, how genuine vs manufactured>,
  "manipulation": <0-100, how much it relies on cheap tricks>,
  "earned": <true/false, is the emotion earned>,
  "moments": [{"text": "<quote>", "emotion": "<what emotion>", "intensity": <1-10>}],
  "critique": "<honest assessment>"
}`
  }
}

/**
 * Specialized judge for memorable moments
 */
export class MemorableMomentsJudge extends BaseLangfuseJudge<{
  quotability: number
  iconicPotential: number
  moments: Array<{
    text: string
    category: 'one_liner' | 'monologue' | 'action' | 'reveal' | 'silence'
    memorability: number
    context: string
  }>
  overallMemorable: number
  critique: string
}> {
  name = 'MemorableMomentsJudge'
  scoreName = ScoreNames.MEMORABLE_MOMENTS

  protected getOutputSchema() {
    return z.object({
      quotability: z.number().min(0).max(100),
      iconicPotential: z.number().min(0).max(100),
      moments: z.array(z.object({
        text: z.string(),
        category: z.enum(['one_liner', 'monologue', 'action', 'reveal', 'silence']),
        memorability: z.number().min(1).max(10),
        context: z.string(),
      })),
      overallMemorable: z.number().min(0).max(100),
      critique: z.string(),
    })
  }

  protected extractScore(parsed: any): number {
    return parsed.overallMemorable
  }

  protected extractReasoning(parsed: any): string {
    const momentCount = parsed.moments.length
    const topMoment = parsed.moments.sort((a: any, b: any) => b.memorability - a.memorability)[0]
    return `${parsed.critique} Found ${momentCount} memorable moment(s).${topMoment ? ` Best: "${topMoment.text.slice(0, 50)}..."` : ''}`
  }

  protected buildPrompt(
    input: string,
    output: string,
    context?: StorytellerContext,
  ): string {
    return `You are evaluating creative writing for MEMORABLE MOMENTS - lines and scenes that people quote, GIF, screenshot, and discuss.

Great memorable moments:
- "I am the one who knocks" - character declaration
- "I gave you all I had" - emotional culmination
- "Tell me about the rabbits" - quiet devastation
- The coin flip in No Country - tension in mundanity
- "I drink your milkshake" - bizarre and unforgettable
- Door holding in Hodor - revelation that recontextualizes everything

What makes moments stick:
1. QUOTABILITY - Could someone quote this in conversation?
2. ICONICITY - Could this become a meme/reference?
3. CONTEXT COMPRESSION - Does it capture something larger?
4. SURPRISE + INEVITABILITY - Unexpected but right

CONTENT TO EVALUATE:
${output}

Find the moments. Look for:
- Lines that could be quoted out of context
- Visual/action beats that could be iconic
- Reveals that reframe everything
- Meaningful silences or pauses
- Character-defining declarations

Respond with JSON:
{
  "quotability": <0-100, how quotable are the best lines>,
  "iconicPotential": <0-100, could any moment become iconic>,
  "moments": [
    {
      "text": "<the moment>",
      "category": "one_liner" | "monologue" | "action" | "reveal" | "silence",
      "memorability": <1-10>,
      "context": "<why it works>"
    }
  ],
  "overallMemorable": <0-100>,
  "critique": "<assessment>"
}`
  }
}
