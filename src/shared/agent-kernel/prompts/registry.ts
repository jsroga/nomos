import { promptRepository } from './repository'
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

// Register Defaults
export function registerCorePrompts() {
  promptRepository.register(RAG_GROUNDING_PROMPT)
  promptRepository.register(CITATION_JUDGE_PROMPT)
  promptRepository.register(HALLUCINATION_JUDGE_PROMPT)
  promptRepository.register(RETRIEVAL_JUDGE_PROMPT)
  promptRepository.register(REVERSE_INTENT_JUDGE_PROMPT)
  promptRepository.register(PERSONA_FIDELITY_JUDGE_PROMPT)
  promptRepository.register(MAGIC_JUDGE_PROMPT)
  promptRepository.register(SCRIPT_FORMAT_PROMPT)
  promptRepository.register(DIALOGUE_PROMPT)
  promptRepository.register(PACING_PROMPT)
  promptRepository.register(MANIPULATION_PROMPT)
  promptRepository.register(TOXICITY_PROMPT)
  promptRepository.register(EQ_PROMPT)
  promptRepository.register(TOOL_USAGE_PROMPT)
  promptRepository.register(CORRECTION_PROMPT)
  promptRepository.register(ORCHESTRATION_PROMPT)
}

export function registerGameDesignPrompts() {
  promptRepository.register(GAME_DESIGN_SYSTEM_PROMPT)
  promptRepository.register(GAME_DESIGN_LOOP_PROMPT)
  promptRepository.register(BALANCE_ANALYSIS_PROMPT)
}
