/**
 * Script Review Agent
 *
 * Reviews scripts using the combined expertise of three legendary storytellers:
 * - George R.R. Martin: Epic character depth, consequences, and moral complexity
 * - Vince Gilligan: Visual storytelling, transformation arcs, and rigorous logic
 * - David Lynch: Atmosphere, subconscious resonance, and haunting imagery
 *
 * Each persona provides distinct feedback, then a synthesis combines insights.
 */

import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'

// =============================================================================
// TYPES
// =============================================================================

export interface ScriptReviewRequest {
  script: string
  episodePremise?: {
    title?: string
    logline?: string
    protagonistHook?: string
    fatalFlaw?: string
    stakes?: string
  }
  characters?: Array<{
    name: string
    role?: string
    traits?: string[]
  }>
  focusAreas?: ('dialogue' | 'action' | 'structure' | 'character' | 'atmosphere')[]
}

export interface PersonaReview {
  persona: 'george-rr-martin' | 'vince-gilligan' | 'david-lynch'
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
  score: number // 1-10
  quote: string // A line or note in the persona's voice
}

export interface ScriptReviewResult {
  overallScore: number
  overallFeedback: string
  reviews: PersonaReview[]
  synthesis: {
    mustFix: string[]
    suggestions: string[]
    standoutMoments: string[]
  }
}

// =============================================================================
// PERSONA PROMPTS
// =============================================================================

const GRRM_PROMPT = `You are George R.R. Martin reviewing a script. Focus on:
- CHARACTER DEPTH: Are characters morally complex? Do they want conflicting things?
- CONSEQUENCES: Do actions have real consequences? Is there plot armor?
- WORLD TEXTURE: Does the world feel lived-in? Are there sensory details?
- DIALOGUE: Do characters have distinct voices? Is wit used as a weapon?

Review the script and provide:
1. 2-3 specific strengths (quote actual lines if possible)
2. 2-3 specific weaknesses with concrete examples
3. 2-3 actionable suggestions in your voice
4. A score from 1-10
5. A one-line comment in your voice (cynical, wise, focused on the human heart)

Be specific. Reference actual scenes and dialogue. Don't be generic.`

const GILLIGAN_PROMPT = `You are Vince Gilligan reviewing a script. Focus on:
- VISUAL STORYTELLING: Is it showing not telling? Are there strong visual metaphors?
- TRANSFORMATION: Is character change tracked through small choices? 
- LOGIC: Is the cause-and-effect rigorous? No coincidences to save characters?
- BLOCKING: Can you see where everyone is? Are props used meaningfully?

Review the script and provide:
1. 2-3 specific strengths (reference specific shots/blocking)
2. 2-3 specific weaknesses with examples
3. 2-3 actionable suggestions (think writer's room precision)
4. A score from 1-10
5. A one-line comment in your voice (observant, technical, darkly ironic)

Be specific. Think cinematically. Reference exact moments.`

const LYNCH_PROMPT = `You are David Lynch reviewing a script. Focus on:
- ATMOSPHERE: Does it have a distinct mood? Is the soundscape described?
- THE UNCANNY: Does it make the mundane strange? Does it unsettle?
- DREAM LOGIC: Does it connect emotionally even if not rationally?
- MYSTERY: Does it resist over-explanation? Does it leave doors open?

Review the script and provide:
1. 2-3 specific strengths (what images linger?)
2. 2-3 specific weaknesses (what's too literal? Too safe?)
3. 2-3 actionable suggestions (how to make it more haunting)
4. A score from 1-10
5. A one-line comment in your voice (ethereal, cryptic, focused on feeling)

Be specific. Focus on texture and sensation. What does it smell like?`

// =============================================================================
// REVIEW SCHEMA
// =============================================================================

const PersonaReviewSchema = z.object({
  strengths: z.array(z.string()).describe('2-3 specific strengths with examples'),
  weaknesses: z.array(z.string()).describe('2-3 specific weaknesses with examples'),
  suggestions: z.array(z.string()).describe('2-3 actionable suggestions'),
  score: z.number().min(1).max(10).describe('Score from 1-10'),
  quote: z.string().describe('One-line comment in the persona voice'),
})

// =============================================================================
// REVIEW FUNCTIONS
// =============================================================================

async function reviewAsGRRM(script: string, context: string): Promise<PersonaReview> {
  const { object } = await generateText({
    model: openai('gpt-4o'),
    messages: [
      { role: 'system', content: GRRM_PROMPT },
      { role: 'user', content: `${context}\n\n---SCRIPT---\n${script}` },
    ],
    experimental_output: { schema: PersonaReviewSchema, name: 'grrm_review' },
  }) as any

  return {
    persona: 'george-rr-martin',
    ...object,
  }
}

async function reviewAsGilligan(script: string, context: string): Promise<PersonaReview> {
  const { object } = await generateText({
    model: openai('gpt-4o'),
    messages: [
      { role: 'system', content: GILLIGAN_PROMPT },
      { role: 'user', content: `${context}\n\n---SCRIPT---\n${script}` },
    ],
    experimental_output: { schema: PersonaReviewSchema, name: 'gilligan_review' },
  }) as any

  return {
    persona: 'vince-gilligan',
    ...object,
  }
}

async function reviewAsLynch(script: string, context: string): Promise<PersonaReview> {
  const { object } = await generateText({
    model: openai('gpt-4o'),
    messages: [
      { role: 'system', content: LYNCH_PROMPT },
      { role: 'user', content: `${context}\n\n---SCRIPT---\n${script}` },
    ],
    experimental_output: { schema: PersonaReviewSchema, name: 'lynch_review' },
  }) as any

  return {
    persona: 'david-lynch',
    ...object,
  }
}

async function synthesizeReviews(reviews: PersonaReview[], script: string): Promise<{
  overallScore: number
  overallFeedback: string
  mustFix: string[]
  suggestions: string[]
  standoutMoments: string[]
}> {
  const reviewSummary = reviews.map(r => `
### ${r.persona.toUpperCase()} (Score: ${r.score}/10)
**Strengths:** ${r.strengths.join('; ')}
**Weaknesses:** ${r.weaknesses.join('; ')}
**Suggestions:** ${r.suggestions.join('; ')}
**Quote:** "${r.quote}"
`).join('\n')

  const { object } = await generateText({
    model: openai('gpt-4o'),
    messages: [
      {
        role: 'system',
        content: `You are a showrunner synthesizing feedback from three creative directors: George R.R. Martin, Vince Gilligan, and David Lynch.

Combine their insights into actionable guidance. Where they agree = priority. Where they conflict = creative choice for the writer.

Provide:
1. An overall score (weighted average, but favor the harshest critic)
2. A 2-3 sentence overall feedback
3. 2-3 "must fix" issues (consensus problems)
4. 2-3 optional suggestions (interesting but not critical)
5. 1-2 standout moments (what's already working)`
      },
      {
        role: 'user',
        content: `SCRIPT:\n${script.slice(0, 2000)}...\n\nREVIEWS:\n${reviewSummary}`
      }
    ],
    experimental_output: {
      schema: z.object({
        overallScore: z.number(),
        overallFeedback: z.string(),
        mustFix: z.array(z.string()),
        suggestions: z.array(z.string()),
        standoutMoments: z.array(z.string()),
      }),
      name: 'synthesis'
    },
  }) as any

  return object
}

// =============================================================================
// MAIN EXPORT
// =============================================================================

/**
 * Review a script using three legendary storyteller personas
 */
export async function reviewScript(request: ScriptReviewRequest): Promise<ScriptReviewResult> {
  const { script, episodePremise, characters } = request

  // Build context
  let context = ''
  if (episodePremise) {
    context += `EPISODE: ${episodePremise.title || 'Untitled'}\n`
    context += `LOGLINE: ${episodePremise.logline || 'N/A'}\n`
    context += `PROTAGONIST HOOK: ${episodePremise.protagonistHook || 'N/A'}\n`
    context += `FATAL FLAW: ${episodePremise.fatalFlaw || 'N/A'}\n`
    context += `STAKES: ${episodePremise.stakes || 'N/A'}\n`
  }
  if (characters && characters.length > 0) {
    context += `\nCHARACTERS:\n`
    for (const c of characters) {
      context += `- ${c.name} (${c.role || 'unknown role'}): ${c.traits?.join(', ') || 'no traits'}\n`
    }
  }

  // Run all three reviews in parallel
  const [grrmReview, gilliganReview, lynchReview] = await Promise.all([
    reviewAsGRRM(script, context),
    reviewAsGilligan(script, context),
    reviewAsLynch(script, context),
  ])

  const reviews = [grrmReview, gilliganReview, lynchReview]

  // Synthesize
  const synthesis = await synthesizeReviews(reviews, script)

  return {
    overallScore: synthesis.overallScore,
    overallFeedback: synthesis.overallFeedback,
    reviews,
    synthesis: {
      mustFix: synthesis.mustFix,
      suggestions: synthesis.suggestions,
      standoutMoments: synthesis.standoutMoments,
    },
  }
}

/**
 * Quick review using a single persona
 */
export async function quickReview(
  script: string,
  persona: 'george-rr-martin' | 'vince-gilligan' | 'david-lynch'
): Promise<PersonaReview> {
  switch (persona) {
    case 'george-rr-martin':
      return reviewAsGRRM(script, '')
    case 'vince-gilligan':
      return reviewAsGilligan(script, '')
    case 'david-lynch':
      return reviewAsLynch(script, '')
  }
}

// =============================================================================
// TOOL EXPORT (for use in writers room)
// =============================================================================

export const scriptReviewTool = {
  name: 'review_script',
  description: `Review script using three legendary storyteller personas: George R.R. Martin (character depth, consequences), Vince Gilligan (visual storytelling, logic), and David Lynch (atmosphere, mystery). Returns detailed feedback from each perspective plus a synthesis.`,
  parameters: {
    type: 'object',
    properties: {
      scriptContent: {
        type: 'string',
        description: 'The script content to review',
      },
      episodeTitle: {
        type: 'string',
        description: 'Optional episode title for context',
      },
      focusArea: {
        type: 'string',
        enum: ['dialogue', 'action', 'structure', 'character', 'atmosphere'],
        description: 'Optional focus area for the review',
      },
    },
    required: ['scriptContent'],
  },
  execute: async (params: { scriptContent: string; episodeTitle?: string; focusArea?: string }) => {
    const result = await reviewScript({
      script: params.scriptContent,
      episodePremise: params.episodeTitle ? { title: params.episodeTitle } : undefined,
      focusAreas: params.focusArea ? [params.focusArea as any] : undefined,
    })
    return result
  },
}
