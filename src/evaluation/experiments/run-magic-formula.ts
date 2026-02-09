import OpenAI from 'openai'
import { runMultiVariantTest, AgentVariant } from './storyteller-experiments'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ============================================
// AGENT FACTORIES
// ============================================

const BASE_SYSTEM_PROMPT = 'You are a master storyteller helper.'
const PRO_SYSTEM_PROMPT =
  'You are a master storyteller. Focus on sensory details, subtext, and specific character voices. Avoid clichés.'
const PERSONA_GRUMPY =
  'You are a grumpy, cynical editor who hates lazy writing. Critique everything before you write it.'

function createStandardAgent(
  name: string,
  modelName: string,
  temp: number,
  prompt: string
): AgentVariant {
  return {
    name,
    config: { type: 'standard', model: modelName, temp, promptShort: prompt.slice(0, 50) + '...' },
    generate: async (input: Record<string, unknown>) => {
      // Simplified intent check for meta queries to avoid wasting LLM calls
      const msg = ((input.message as string) || '').toLowerCase()
      if (msg.includes('phase')) return { response: `Phase: ${input.phase || 'unknown'}` }

      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: JSON.stringify(input) },
        ],
        temperature: temp,
      })
      return { response: response.choices[0].message.content }
    },
  }
}

function createCoTAgent(name: string, modelName: string, temp: number): AgentVariant {
  return {
    name,
    config: { type: 'chain-of-thought', model: modelName, temp },
    generate: async (input: Record<string, unknown>) => {
      const response = await openai.chat.completions.create({
        model: modelName,
        messages: [
          {
            role: 'system',
            content:
              PRO_SYSTEM_PROMPT +
              ' Think step-by-step about the request before generating the output.',
          },
          { role: 'user', content: JSON.stringify(input) },
        ],
        temperature: temp,
      })
      return { response: response.choices[0].message.content }
    },
  }
}

// ============================================
// VARIANTS (A-J)
// ============================================

const variants: AgentVariant[] = [
  // --- BASELINES ---
  createStandardAgent('A-Vanilla-4o', 'gpt-4o', 0.7, BASE_SYSTEM_PROMPT),
  createStandardAgent('B-Vanilla-4o-Mini', 'gpt-4o-mini', 0.7, BASE_SYSTEM_PROMPT), // Speed baseline

  // --- PROMPT ENGINEERING ---
  createStandardAgent('C-Pro-Prompt', 'gpt-4o', 0.7, PRO_SYSTEM_PROMPT),
  createStandardAgent('D-Persona-Grumpy', 'gpt-4o', 0.8, PERSONA_GRUMPY),

  // --- TEMPERATURE SWEEPS ---
  createStandardAgent('E-Temp-Low (0.2)', 'gpt-4o', 0.2, PRO_SYSTEM_PROMPT),
  createStandardAgent('F-Temp-High (0.9)', 'gpt-4o', 0.9, PRO_SYSTEM_PROMPT),

  // --- STRATEGIES ---
  createCoTAgent('G-ChainOfThought', 'gpt-4o', 0.7),

  // --- ADVANCED MODELS (Mocking distinct behaviors if same API key is used, or switching if available) ---
  // Switched from Mock logic to direct parameter variation
  createStandardAgent(
    'H-Max-Tokens-Limited',
    'gpt-4o',
    0.7,
    PRO_SYSTEM_PROMPT + ' Keep it under 50 words.'
  ),

  // --- "MAGIC FORMULA" CANDIDATES ---
  {
    name: 'I-Critique-Loop',
    config: { type: 'agentic-loop', cycles: 1 },
    generate: async (input: Record<string, unknown>) => {
      // 1. Draft
      const draftRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: PRO_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(input) },
        ],
        temperature: 0.7,
      })
      const draft = draftRes.choices[0].message.content || ''

      // 2. Critique
      const critiqueRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Critique this for clichés.' },
          { role: 'user', content: draft },
        ],
        temperature: 0.7,
      })
      const critique = critiqueRes.choices[0].message.content || ''

      // 3. Refine
      const finalRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'Improve based on critique.' },
          { role: 'user', content: `Draft: ${draft}\nCritique: ${critique}` },
        ],
        temperature: 0.7,
      })
      return { response: finalRes.choices[0].message.content }
    },
  },
  {
    name: 'J-The-Formula (Best Guess)',
    config: { type: 'hybrid', desc: 'High Temp + Persona + CoT' },
    generate: async (input: Record<string, unknown>) => {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: PRO_SYSTEM_PROMPT + ' You are an eccentric genius writer.' },
          { role: 'user', content: `Think step-by-step: ${JSON.stringify(input)}` },
        ],
        temperature: 0.85,
      })
      return { response: response.choices[0].message.content }
    },
  },
]

// ============================================
// EXECUTION
// ============================================

async function main() {
  await runMultiVariantTest('Magic Formula Discovery v1', variants)
}

if (require.main === module) {
  main().catch(console.error)
}
