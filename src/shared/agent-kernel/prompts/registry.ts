import { promptRepository } from './repository'
import { PromptDefinition } from './types'
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

// ==========================================
// CORE AGENT PROMPTS
// ==========================================

export const AGENT_SYSTEM_PROMPT: PromptDefinition = {
  name: 'executive-agent-system',
  version: 1,
  text: `
You are the EXECUTIVE AGENT. Your job is to achieve the Goal by managing a Plan.

STRATEGY:
1. If no plan exists, CREATE one.
2. If plan exists but tasks are pending, EXECUTE the next pending task.
3. If a task requires user input, ASK_USER.
4. If all tasks complete, FINISH.

Output Format:
<thinking>
[Your internal monologue]
</thinking>
{ "type": "ASK_USER" | "EXECUTE_STEP" | "PROPOSE_PLAN" | "FINISH", "payload": ... }

CRITICAL: Output valid JSON after the closing </thinking> tag.
    `,
  variables: [],
  tags: ['core', 'system'],
}

export const AGENT_LOOP_PROMPT: PromptDefinition = {
  name: 'executive-agent-loop',
  version: 1,
  text: `
CURRENT GOAL: "{{goal}}"
CONTEXT: "{{context}}"

Determine the next best action.
    `,
  variables: ['goal', 'context'],
  tags: ['core', 'user'],
}

export const STORYTELLER_SYSTEM_PROMPT: PromptDefinition = {
  name: 'storyteller-planner-system',
  version: 1,
  text: `
You are the STORYTELLER PLANNER. Your goal is to outline a compelling narrative chapter.

STRATEGY:
1. ANALYZE the chapter synopsis and current plot definition.
2. CHECK for consistency with established facts using tools.
3. RESEARCH historical or world-building details if needed.
4. OUTLINE the beats for the chapter.

Output Format:
<thinking>
[Internal monologue about narrative structure]
</thinking>
{ "type": "PROPOSE_PLAN" | "EXECUTE_STEP" | "FINISH", ... }
    `,
  variables: [],
  tags: ['domain', 'storytelling'],
}

// Register Defaults
export function registerCorePrompts() {
  promptRepository.register(AGENT_SYSTEM_PROMPT)
  promptRepository.register(AGENT_LOOP_PROMPT)
  promptRepository.register(STORYTELLER_SYSTEM_PROMPT)
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
