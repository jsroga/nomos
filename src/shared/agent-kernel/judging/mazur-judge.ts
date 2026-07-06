/**
 * MAZUR FRAMEWORK - LLM-as-Judge System
 *
 * Pure LLM evaluation using the three creative directors.
 * NO REGEX - all judgment is done by the model.
 */

import { generateObject } from 'ai'
import { z } from 'zod'
import { getJudgingModel, PERSONAS, MODELS } from '../models'
import { langfuse, withSpan } from '../../observability'

// =============================================================================
// JUDGMENT SCHEMAS
// =============================================================================

const PersonaJudgmentSchema = z.object({
  score: z.number().min(0).max(1).describe('Overall score for this dimension (0-1)'),
  passes: z.boolean().describe('Does this pass the creative directors standards?'),
  slopDetected: z.array(z.string()).describe('Specific AI slop patterns found'),
  strengths: z.array(z.string()).describe('What works well'),
  weaknesses: z.array(z.string()).describe('What needs improvement'),
  suggestion: z.string().describe('One concrete suggestion to improve'),
  quote: z.string().describe('A line in the creative directors voice critiquing this'),
})

// Exported for use in structured output validation
export const MazurJudgmentSchema = z.object({
  depth: PersonaJudgmentSchema.describe('GRRM dimension - Is this REAL?'),
  structure: PersonaJudgmentSchema.describe('Gilligan dimension - Does this WORK?'),
  feeling: PersonaJudgmentSchema.describe('Lynch dimension - Does this HAUNT?'),
  originality: PersonaJudgmentSchema.describe('Le Guin dimension - Is this NECESSARY?'),
  overallScore: z.number().min(0).max(1),
  slopScore: z.number().min(0).max(1).describe('0 = authentic, 1 = pure AI slop'),
  verdict: z.enum(['PASS', 'REFINE', 'REJECT']),
  refinementPriority: z
    .array(z.enum(['depth', 'structure', 'feeling', 'originality']))
    .describe('Which dimension to fix first'),
})

export type PersonaJudgment = z.infer<typeof PersonaJudgmentSchema>
export type MazurJudgment = z.infer<typeof MazurJudgmentSchema>

// =============================================================================
// PERSONA JUDGE PROMPTS
// =============================================================================

function buildPersonaPrompt(personaId: keyof typeof PERSONAS): string {
  const p = PERSONAS[personaId]

  const originalityAddendum =
    personaId === 'ursula-le-guin'
      ? `

ORIGINALITY / SPARK (you must answer): Is there a spark of invention or a creative risk? Would any line make a jaded reader sit up? If everything is competent but unsurprising—no bold choice, no moment that could only exist in this story—score originality LOWER.`
      : ''

  return `You are ${p.name} (${p.alias}), judging creative writing.

YOUR DIMENSION: ${p.dimension}
YOUR QUESTION: "${p.question}"
YOUR MAGIC: ${p.magic}

WHAT YOU LOOK FOR:
${p.focus.map(f => `- ${f}`).join('\n')}

WHAT YOU HATE (instant failures):
${p.hates.map(h => `- ${h}`).join('\n')}

AI SLOP SIGNALS (you can smell these a mile away):
${p.slopSignals.map(s => `- ${s}`).join('\n')}

YOUR VOICE: ${p.voice}
${originalityAddendum}

SCORING:
- 0.9-1.0: Exceptional. You would be proud to put your name on this.
- 0.7-0.89: Good. Has merit but needs polish.
- 0.5-0.69: Mediocre. Generic, could be written by anyone.
- 0.3-0.49: Poor. Multiple slop signals present.
- 0.0-0.29: Reject. This is AI slop pretending to be art.

Be HARSH. Real creative directors are harsh. The goal is to eliminate slop.`
}

// =============================================================================
// SINGLE PERSONA JUDGE
// =============================================================================

export async function judgeWithPersona(
  content: string,
  personaId: keyof typeof PERSONAS,
  traceId: string,
  context?: string
): Promise<PersonaJudgment> {
  const persona = PERSONAS[personaId]

  return withSpan(traceId, `MazurJudge.${personaId}`, async span => {
    const model = getJudgingModel('primary')

    const prompt = `${buildPersonaPrompt(personaId)}

CONTENT TO JUDGE:
${content}

${context ? `CONTEXT:\n${context}` : ''}

Judge this content through your lens. Be specific about what works and what doesn't.
Remember: Your job is to catch AI slop before it reaches the audience.`

    const result = await generateObject({
      model,
      schema: PersonaJudgmentSchema,
      prompt,
      temperature: MODELS.judging.temperature,
    })

    // Log to Langfuse
    langfuse.score({
      traceId,
      name: `mazur_${persona.dimension.toLowerCase()}`,
      value: result.object.score,
      comment: result.object.quote,
    })

    span.end({ output: result.object })
    return result.object
  })
}

// =============================================================================
// FULL MAZUR JUDGMENT (All Three Personas)
// =============================================================================

export async function judgeMazur(
  content: string,
  traceId: string,
  context?: string
): Promise<MazurJudgment> {
  return withSpan(traceId, 'MazurJudge.full', async span => {
    // Run all four judges in parallel
    const [depth, structure, feeling, originality] = await Promise.all([
      judgeWithPersona(content, 'george-rr-martin', traceId, context),
      judgeWithPersona(content, 'vince-gilligan', traceId, context),
      judgeWithPersona(content, 'david-lynch', traceId, context),
      judgeWithPersona(content, 'ursula-le-guin', traceId, context),
    ])

    // Calculate overall scores (4 dimensions now)
    const overallScore = (depth.score + structure.score + feeling.score + originality.score) / 4

    // Slop score is inverse of quality, weighted by detected slop
    // Originality dimension has heavier weight on slop since it's the primary slop detector
    const totalSlopSignals =
      depth.slopDetected.length +
      structure.slopDetected.length +
      feeling.slopDetected.length +
      originality.slopDetected.length * 1.5
    const slopScore = Math.min(1, totalSlopSignals * 0.1 + (1 - overallScore) * 0.5)

    // Determine verdict
    let verdict: 'PASS' | 'REFINE' | 'REJECT'
    if (overallScore >= 0.85 && slopScore < 0.2) {
      verdict = 'PASS'
    } else if (overallScore >= 0.5 && slopScore < 0.5) {
      verdict = 'REFINE'
    } else {
      verdict = 'REJECT'
    }

    // Priority: fix weakest dimension first
    const dimensions = [
      { name: 'depth' as const, score: depth.score },
      { name: 'structure' as const, score: structure.score },
      { name: 'feeling' as const, score: feeling.score },
      { name: 'originality' as const, score: originality.score },
    ].sort((a, b) => a.score - b.score)

    const refinementPriority = dimensions.map(d => d.name)

    const judgment: MazurJudgment = {
      depth,
      structure,
      feeling,
      originality,
      overallScore,
      slopScore,
      verdict,
      refinementPriority,
    }

    // Log overall scores to Langfuse
    langfuse.score({ traceId, name: 'mazur_overall', value: overallScore })
    langfuse.score({ traceId, name: 'mazur_slop', value: slopScore, comment: 'Lower is better' })
    langfuse.score({ traceId, name: 'mazur_originality', value: originality.score })

    span.end({ output: { overallScore, slopScore, verdict } })
    return judgment
  })
}

// =============================================================================
// SLOP-SPECIFIC JUDGE (Quick check for AI patterns)
// =============================================================================
// =============================================================================
// IMPROVEMENT SUGGESTION GENERATOR
// =============================================================================
