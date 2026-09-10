/**
 * Which model each agent role starts on, and how it samples.
 *
 * Three models, three jobs: `DEFAULT_CHAT_MODEL` (Kimi) for anything the writer
 * reads as writing or as story structure — the Writers Room picker may swap
 * those to Sol; `CHEAP_TIER_CHAT_MODEL` (GLM) for short structured work the
 * writer never reads as prose, hardcoded and unlisted in the picker.
 */
import {
  CHEAP_TIER_CHAT_MODEL,
  DEFAULT_CHAT_MODEL,
} from '@/domains/storyteller/config/chat-model-catalog'

export interface AgentModelConfig {
  model: string
  temperature: number
  topP: number
  maxOutputTokens: number
  rationale: string
}

export const AGENT_MODEL_MATRIX: Record<string, AgentModelConfig> = {
  critic: {
    model: CHEAP_TIER_CHAT_MODEL,
    temperature: 0.3,
    topP: 0.9,
    maxOutputTokens: 2000,
    rationale:
      'Narrow diagnose-only critics with quoted evidence — a checker, not a writer. Pin via STORYTELLER_CRITIC_MODEL.',
  },
  muse: {
    model: CHEAP_TIER_CHAT_MODEL,
    temperature: 1.0,
    topP: 0.98,
    maxOutputTokens: 1500,
    rationale:
      'Blank-context wildcard ideas — entropy is code-side (D4), so the model only has to be cheap and varied. Not driven by the Writers Room picker.',
  },
  chat: {
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.7,
    topP: 0.9,
    maxOutputTokens: 8000,
    rationale:
      'Writers Room chat adapter. Per-request picker (Kimi / Sol) wins; else STORYTELLER_CHAT_MODEL; else this default. Headroom is set well above answer length because reasoning draws from this same budget: measured by chat-model-output-budget.e2e, a one-sentence answer costs 463-779 reasoning tokens (up to 98% of the spend). The old 2000 left too little for a full bible section once reasoning is paid.',
  },
  author: {
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.75,
    topP: 0.92,
    maxOutputTokens: 8000,
    rationale:
      'Single GRRM author drafts AND revises — the token-heavy prose slot. Picker choice applies; pin via STORYTELLER_AUTHOR_MODEL. Code models are prohibited in storyteller.',
  },
  planner: {
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.6,
    topP: 0.9,
    maxOutputTokens: 4000,
    rationale:
      'Beat plans decide what the author dramatizes. Structure sits with the prose model; pin via STORYTELLER_PLANNER_MODEL.',
  },
  premise: {
    model: DEFAULT_CHAT_MODEL,
    temperature: 0.8,
    topP: 0.95,
    maxOutputTokens: 8000,
    rationale:
      'Premise / roadmap architecture. Structure sits with the prose model; pin via STORYTELLER_PREMISE_MODEL.',
  },
}
