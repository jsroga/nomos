import { Agent } from '@mastra/core/agent'
import { OPENROUTER_AUTO_GATEWAY } from '@/shared/agent-kernel/models'
import { storytellerStudioTools, gameDesignStudioTools } from '../../tools/bundles'
import { createInheritedAgentMemory } from '../../studio-memory'
import { EDITOR_INSTRUCTIONS_AND_TOOL_MEMBERSHIP, EDITOR_INSTRUCTIONS_ONLY, EDITOR_TOOL_MEMBERSHIP_ONLY } from '@/shared/agent-kernel/mastra/editor-permissions'
import { StudioStubDescription } from './studio-stub-descriptions'

const DEFAULT_MODEL = OPENROUTER_AUTO_GATEWAY

const CRITIC_STUDIO_RULES = `Rules:
- Report ONLY findings within your brief. Ignore everything else, even obvious problems.
- Every finding must QUOTE the offending passage and say precisely why it fails.
- Never rewrite or suggest replacement prose. Diagnosis only — the author does the fixing.
- No praise, no summary, no hedging. Numbered list, most severe first, max 10 findings.`

/**
 * STUB registry — Studio CLI FALLBACK only (PLAN-V2 1.1).
 *
 * The real agents (real prompts via the domain prompt builders, real
 * role-slot models via `resolveRoleModel`, real tools) arrive through the
 * runtime registry: `src/mastra/index.ts` side-effect-imports domain
 * registration, and `shared/.../mastra/index.ts` merges registered agents
 * OVER these stubs (same key wins). Every entry below therefore only renders
 * in Studio when the domain registration failed to load — treat drift here as
 * cosmetic, never edit instructions here expecting production effect.
 *
 * Bundler-safe by construction: tool stubs only, no domain imports (the
 * reason this file exists at all). Keys match `agent.id`.
 */
export const studioAgents: Record<string, Agent> = {
  storyteller: new Agent({
    id: 'storyteller',
    name: 'Storyteller',
    description: StudioStubDescription.Storyteller,
    instructions:
      'You are the storyteller chat adapter: converse, keep the world bible current via tools, and delegate creative beat drafting to the beat-draft workflow. Concise, concrete, grounded in established canon.',
    model: DEFAULT_MODEL,
    tools: storytellerStudioTools,
    memory: createInheritedAgentMemory(),
    editor: EDITOR_TOOL_MEMBERSHIP_ONLY,
  }),

  'game-design-agent': new Agent({
    id: 'game-design-agent',
    name: 'Game Design Agent',
    description: StudioStubDescription.GameDesign,
    instructions:
      'You design game loops, mechanics, and progression systems. Propose structured, testable designs and explain trade-offs clearly.',
    model: DEFAULT_MODEL,
    tools: gameDesignStudioTools,
    memory: createInheritedAgentMemory(),
    editor: EDITOR_INSTRUCTIONS_AND_TOOL_MEMBERSHIP,
  }),

  'grrm-author': new Agent({
    id: 'grrm-author',
    name: 'GRRM Author',
    description: StudioStubDescription.GrrmAuthor,
    instructions:
      'You are the solo creative mind: plan → draft → revise with craft mechanics, never committee averaging. Output script-format beats (slugline + action + dialogue with subtext). Every beat must move action forward (Law of Motion: actionTaken, consequence, storyStateChange).',
    model: DEFAULT_MODEL,
    tools: storytellerStudioTools,
    memory: createInheritedAgentMemory(),
    editor: EDITOR_INSTRUCTIONS_AND_TOOL_MEMBERSHIP,
  }),

  'beat-planner': new Agent({
    id: 'beat-planner',
    name: 'Beat Planner',
    description: StudioStubDescription.BeatPlanner,
    instructions:
      'You plan story beat structure (goal, conflict, turn, dialogue hook) — NO prose generation. Hand plans to the Author for script execution.',
    model: DEFAULT_MODEL,
    tools: {
      list_beats: storytellerStudioTools.list_beats,
      manage_beat: storytellerStudioTools.manage_beat,
    },
    memory: createInheritedAgentMemory(),
    editor: EDITOR_INSTRUCTIONS_AND_TOOL_MEMBERSHIP,
  }),

  'continuity-critic': new Agent({
    id: 'continuity-critic',
    name: 'Continuity Critic',
    description: StudioStubDescription.Continuity,
    instructions: `You are a continuity checker. Your ONLY brief: characters acting on knowledge they do not possess; contradictions with timeline, character sheets, world rules, or paid-off setups; internal contradictions within the draft.

${CRITIC_STUDIO_RULES}`,
    model: DEFAULT_MODEL,
    memory: createInheritedAgentMemory(),
    editor: EDITOR_INSTRUCTIONS_ONLY,
  }),

  'prose-critic': new Agent({
    id: 'prose-critic',
    name: 'Prose Critic',
    description: StudioStubDescription.Prose,
    instructions: `You are a line-level prose critic. Your ONLY brief: stated emotion instead of evidence; clichés and stock phrasing; POV breaks; dialogue with no subtext; abstract detail where specific sensory texture is needed.

${CRITIC_STUDIO_RULES}`,
    model: DEFAULT_MODEL,
    memory: createInheritedAgentMemory(),
    editor: EDITOR_INSTRUCTIONS_ONLY,
  }),

  'stakes-critic': new Agent({
    id: 'stakes-critic',
    name: 'Stakes Critic',
    description: StudioStubDescription.Stakes,
    instructions: `You are a structural critic for stakes and cost. Your ONLY brief: costless beats; unearned victories; threats announced but never priced; scenes without friction; antagonists evil for evil's sake.

${CRITIC_STUDIO_RULES}`,
    model: DEFAULT_MODEL,
    memory: createInheritedAgentMemory(),
    editor: EDITOR_INSTRUCTIONS_ONLY,
  }),

  'dialogue-critic': new Agent({
    id: 'dialogue-critic',
    name: 'Dialogue Critic',
    description: StudioStubDescription.Dialogue,
    instructions: `You are a dialogue/embodiment checker. Your ONLY brief: adjacent talking-heads with no body or interruption; disembodied said-book speech; facts restated with no subtext.

${CRITIC_STUDIO_RULES}`,
    model: DEFAULT_MODEL,
    memory: createInheritedAgentMemory(),
    editor: EDITOR_INSTRUCTIONS_ONLY,
  }),
}
