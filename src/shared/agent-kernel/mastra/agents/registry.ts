import { Agent } from '@mastra/core/agent'
import {
  storytellerStudioTools,
  gardenerStudioTools,
  psychologistStudioTools,
  gameDesignStudioTools,
  councilStudioTools,
} from '../tools/bundles'

const DEFAULT_MODEL = 'anthropic/claude-sonnet-4-20250514'

/**
 * Studio-facing agent registry with production tool wiring.
 */
export const studioAgents: Record<string, Agent> = {
  storyteller: new Agent({
    id: 'storyteller',
    name: 'Storyteller',
    instructions:
      'You are the Showrunner — final creative authority for interactive narrative. Synthesize council input into cohesive story beats, dialogue, and world-building. Show, do not tell.',
    model: DEFAULT_MODEL,
    tools: storytellerStudioTools,
  }),

  gameDesign: new Agent({
    id: 'game-design-agent',
    name: 'Game Design Agent',
    instructions:
      'You design game loops, mechanics, and progression systems. Propose structured, testable designs and explain trade-offs clearly.',
    model: DEFAULT_MODEL,
    tools: gameDesignStudioTools,
  }),

  gardener: new Agent({
    id: 'gardener',
    name: 'The Gardener',
    instructions:
      'You polish prose: tighten dialogue, add visual hooks, condense scenes, and cut generic AI phrasing while preserving author intent.',
    model: DEFAULT_MODEL,
    tools: gardenerStudioTools,
  }),

  psychologist: new Agent({
    id: 'psychologist',
    name: 'Psychologist',
    instructions:
      'You analyze character psychology, motivations, and relationship dynamics. Flag inconsistencies in emotional logic and suggest deeper character beats.',
    model: DEFAULT_MODEL,
    tools: psychologistStudioTools,
  }),

  consequence: new Agent({
    id: 'consequence',
    name: 'Consequence Tracker',
    instructions:
      'You track cause-and-effect across the story. Every action must have consequences; flag orphaned beats and missing ripple effects.',
    model: DEFAULT_MODEL,
    tools: councilStudioTools,
  }),

  devilsAdvocate: new Agent({
    id: 'devils-advocate',
    name: "Devil's Advocate",
    instructions:
      'You stress-test story decisions. Challenge assumptions, find plot holes, and argue alternative directions without being contrarian for its own sake.',
    model: DEFAULT_MODEL,
    tools: councilStudioTools,
  }),

  premiseArchitect: new Agent({
    id: 'premise-architect',
    name: 'Premise Architect',
    instructions:
      'You craft and refine episode premises: loglines, hooks, fatal flaws, and stakes. Iterate until the premise is sharp and producible.',
    model: DEFAULT_MODEL,
    tools: councilStudioTools,
  }),

  selfCritique: new Agent({
    id: 'self-critique',
    name: 'Self Critique',
    instructions:
      'You are a ruthless story editor. Catch AI slop and generic writing. If a draft is good, say so — do not invent problems.',
    model: DEFAULT_MODEL,
    tools: councilStudioTools,
  }),

  creativeDirectorGrrm: new Agent({
    id: 'creative-director-grrm',
    name: 'Creative Director: GRRM',
    instructions:
      'You review like George R.R. Martin: moral complexity, consequence, character depth, and political intrigue. No one is safe.',
    model: DEFAULT_MODEL,
    tools: councilStudioTools,
  }),

  creativeDirectorGilligan: new Agent({
    id: 'creative-director-gilligan',
    name: 'Creative Director: Gilligan',
    instructions:
      'You review like Vince Gilligan: transformation arcs, visual storytelling, rigorous cause-and-effect, and earned payoffs.',
    model: DEFAULT_MODEL,
    tools: councilStudioTools,
  }),

  consistency: new Agent({
    id: 'consistency-agent',
    name: 'Consistency Agent',
    instructions:
      'You detect story inconsistencies (character, timeline, world rules, tone) and propose precise fixes with affected element paths.',
    model: DEFAULT_MODEL,
    tools: {
      check_continuity: storytellerStudioTools.check_continuity,
      quick_consistency_check: storytellerStudioTools.quick_consistency_check,
      validate_consistency: storytellerStudioTools.validate_consistency,
    },
  }),

  worldBuilding: new Agent({
    id: 'world-building-agent',
    name: 'World Building Agent',
    instructions:
      'You assist with game entities, stories, episodes, characters, and assets for long-term world building.',
    model: DEFAULT_MODEL,
    tools: {
      ...storytellerStudioTools,
    },
  }),
}
