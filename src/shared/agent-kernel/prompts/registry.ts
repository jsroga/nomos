import { EVAL_PROMPT_DESCRIPTIONS } from './constants/eval-prompt-descriptions'
import { catalogDomainFromTags, promptCatalogDescription } from './prompt-catalog-copy'
import { promptRepository } from './repository'
import type { PromptDefinition } from './types'
import {
  BALANCE_ANALYSIS_PROMPT,
  GAME_DESIGN_LOOP_PROMPT,
  GAME_DESIGN_SYSTEM_PROMPT,
} from './registry-game-design-prompts'
import {
  CITATION_JUDGE_PROMPT,
  CORRECTION_PROMPT,
  DIALOGUE_PROMPT,
  EQ_PROMPT,
  HALLUCINATION_JUDGE_PROMPT,
  MAGIC_JUDGE_PROMPT,
  MANIPULATION_PROMPT,
  ORCHESTRATION_PROMPT,
  PACING_PROMPT,
  PERSONA_FIDELITY_JUDGE_PROMPT,
  RAG_GROUNDING_PROMPT,
  RETRIEVAL_JUDGE_PROMPT,
  REVERSE_INTENT_JUDGE_PROMPT,
  SCRIPT_FORMAT_PROMPT,
  TOOL_USAGE_PROMPT,
  TOXICITY_PROMPT,
} from './registry-evaluation-prompts'

export {
  BALANCE_ANALYSIS_PROMPT,
  GAME_DESIGN_LOOP_PROMPT,
  GAME_DESIGN_SYSTEM_PROMPT,
} from './registry-game-design-prompts'
export {
  CITATION_JUDGE_PROMPT,
  CORRECTION_PROMPT,
  DIALOGUE_PROMPT,
  EQ_PROMPT,
  HALLUCINATION_JUDGE_PROMPT,
  MAGIC_JUDGE_PROMPT,
  MANIPULATION_PROMPT,
  ORCHESTRATION_PROMPT,
  PACING_PROMPT,
  PERSONA_FIDELITY_JUDGE_PROMPT,
  RAG_GROUNDING_PROMPT,
  RETRIEVAL_JUDGE_PROMPT,
  REVERSE_INTENT_JUDGE_PROMPT,
  SCRIPT_FORMAT_PROMPT,
  TOOL_USAGE_PROMPT,
  TOXICITY_PROMPT,
} from './registry-evaluation-prompts'

const CORE_EVAL_PROMPTS = [
  RAG_GROUNDING_PROMPT,
  CITATION_JUDGE_PROMPT,
  HALLUCINATION_JUDGE_PROMPT,
  RETRIEVAL_JUDGE_PROMPT,
  REVERSE_INTENT_JUDGE_PROMPT,
  PERSONA_FIDELITY_JUDGE_PROMPT,
  MAGIC_JUDGE_PROMPT,
  SCRIPT_FORMAT_PROMPT,
  DIALOGUE_PROMPT,
  PACING_PROMPT,
  MANIPULATION_PROMPT,
  TOXICITY_PROMPT,
  EQ_PROMPT,
  TOOL_USAGE_PROMPT,
  CORRECTION_PROMPT,
  ORCHESTRATION_PROMPT,
] as const

function describedPrompt(definition: PromptDefinition): PromptDefinition {
  const body = definition.description ?? EVAL_PROMPT_DESCRIPTIONS[definition.name]
  if (!body) {
    throw new Error(`Missing PromptDefinition.description for ${definition.name}`)
  }
  return {
    ...definition,
    description: promptCatalogDescription(catalogDomainFromTags(definition.tags), body),
  }
}

export function registerCorePrompts() {
  for (const definition of CORE_EVAL_PROMPTS) {
    promptRepository.register(describedPrompt(definition))
  }
}

export function registerGameDesignPrompts() {
  promptRepository.register(describedPrompt(GAME_DESIGN_SYSTEM_PROMPT))
  promptRepository.register(describedPrompt(GAME_DESIGN_LOOP_PROMPT))
  promptRepository.register(describedPrompt(BALANCE_ANALYSIS_PROMPT))
}
