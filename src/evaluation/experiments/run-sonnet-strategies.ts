import Anthropic from '@anthropic-ai/sdk'
import OpenAI from 'openai'
import { runMultiVariantTest, AgentVariant } from './storyteller-experiments'
import { getErrorMessage } from '@/shared/errors/error-utils'

// ============================================
// CLAUDE 3.5 SONNET CONFIGURATION
// ============================================

const MODEL_NAME = 'claude-3-5-sonnet-20240620'
const FALLBACK_MODEL = 'gpt-4o'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ============================================
// PROMPTING STRATEGIES
// ============================================

const BASE_SYSTEM_PROMPT = 'You are a creative writing assistant.'

function createClaudeVariant(
  name: string,
  strategyName: string,
  systemPrompt: string,
  temp: number = 0.7
): AgentVariant {
  return {
    name: `${name} (${strategyName})`,
    config: { type: 'claude-strategy', model: MODEL_NAME, temp, strategy: strategyName },
    generate: async (input: Record<string, unknown>) => {
      // Simplified intent check
      const msg = ((input.message as string) || '').toLowerCase()
      if (msg.includes('phase')) return { response: `Phase: ${input.phase || 'unknown'}` }

      try {
        const res = await anthropic.messages.create({
          model: MODEL_NAME,
          max_tokens: 4096,
          temperature: temp,
          system: systemPrompt,
          messages: [{ role: 'user', content: JSON.stringify(input) }],
        })

        const content = res.content[0].type === 'text' ? res.content[0].text : ''
        return { response: content }
      } catch (err: unknown) {
        if (
          err.status === 400 ||
          err.status === 401 ||
          err.status === 429 ||
          (getErrorMessage(err) && getErrorMessage(err).includes('credit'))
        ) {
          console.warn(`⚠️ API Issue: Falling back to ${FALLBACK_MODEL} for ${name}`)
          const res = await openai.chat.completions.create({
            model: FALLBACK_MODEL,
            messages: [
              {
                role: 'system',
                content: `[SIMULATING CLAUDE STRATEGY: ${strategyName}]\n${systemPrompt}`,
              },
              { role: 'user', content: JSON.stringify(input) },
            ],
            temperature: temp,
          })
          return { response: res.choices[0].message.content }
        }
        throw err
      }
    },
  }
}

// ============================================
// STRATEGY VARIANTS (A-J)
// ============================================

const variants: AgentVariant[] = [
  // --- CONTROL ---
  createClaudeVariant('A', 'Baseline', BASE_SYSTEM_PROMPT),

  // --- STYLE & VOICE ---
  createClaudeVariant(
    'B',
    'Show Dont Tell',
    'You are an expert novelist. Focusing strictly on "Show, Don\'t Tell". Never name an emotion directly; describe the physical sensations and environmental details that imply it.'
  ),

  createClaudeVariant(
    'C',
    'Sensory Overload',
    'You are a descriptive writer. Maximize sensory details. Describe smells, textures, sounds, and lighting in every paragraph to immerse the reader.'
  ),

  createClaudeVariant(
    'D',
    'Minimalist/Hemingway',
    'Write like Hemingway. Short sentences. Simple words. Punchy, direct action. Avoid adverbs. Focus on the raw truth of the moment.'
  ),

  createClaudeVariant(
    'E',
    'Purple Prose/Lovecraft',
    'Write in a dense, archaic, and atmospheric style. Use complex vocabulary, long flowing sentences, and metaphors. Establish a mood of grandeur or dread.'
  ),

  // --- STRUCTURAL ---
  createClaudeVariant(
    'F',
    'In Media Res',
    'Always start the response in the middle of action. No preamble. No setup. Thrust the reader directly into the conflict or dialogue.'
  ),

  createClaudeVariant(
    'G',
    'Deep POV',
    'Write in Deep Point of View (Deep POV). Remove all filtration words like "he saw", "she felt", "he heard". Write directly from inside the character\'s immediate experience.'
  ),

  // --- CONCEPTUAL ---
  createClaudeVariant(
    'H',
    'Unreliable Narrator',
    'Write from the perspective of a narrator who might be lying, confused, or biased. Plant subtle clues that the reality might differ from their description.'
  ),

  createClaudeVariant(
    'I',
    'Stream of Consciousness',
    'Write in a stream of consciousness style. Follow the chaotic flow of thoughts, memories, and sensory inputs as they occur to the character.'
  ),

  // --- "MAGIC FORMULA" CANDIDATE ---
  createClaudeVariant(
    'J',
    'The Architect',
    'You are a Master Storyteller. Combine: 1) Deep POV for immersion, 2) "Show Don\'t Tell" for impact, and 3) A distinct, confident voice. Avoid all clichés. Surprise the reader with specific, unique details.'
  ),
]

// ============================================
// EXECUTION
// ============================================

async function main() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('❌ ANTHROPIC_API_KEY is missing from environment variables.')
    process.exit(1)
  }
  await runMultiVariantTest('Claude 3.5 Sonnet Strategy Sweep', variants)
}

if (require.main === module) {
  main().catch(console.error)
}
