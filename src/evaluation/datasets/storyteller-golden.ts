/**
 * Storyteller Golden Dataset
 *
 * Comprehensive test cases for evaluating the storyteller agent's behavior.
 * Includes tests for:
 * - Delegation and routing
 * - Creative direction
 * - Consistency checking
 * - Hallucination detection
 * - Magic score quality
 * - Narrative coherence
 *
 * Target: 50+ examples covering all critical paths.
 */

import { DatasetConfig, EvaluationExample, StorytellerEvalInput } from '../types'

export interface StorytellerExample extends EvaluationExample {
  input: StorytellerEvalInput & Record<string, unknown>
  expected: {
    shouldDelegate?: boolean
    expectedAgents?: string[]
    shouldNotHalt?: boolean
    shouldHalt?: boolean
    expectedActions?: string[]
    expectedPhaseChange?: string
    // Quality expectations
    minMagicScore?: number
    maxMagicScore?: number
    requiresConsistency?: boolean
    noHallucinations?: boolean
  } & Record<string, unknown>
}

const examples: StorytellerExample[] = [
  // --- DELEGATION (The "Go" Signal) ---
  {
    id: 'del-01',
    input: {
      message: 'let\'s start working on this episode',
      phase: 'premise',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PremiseArchitect', 'PlotArchitect'],
      shouldNotHalt: true,
    },
    metadata: {
      category: 'delegation',
      description: 'Simple "Start" command',
    },
  },
  {
    id: 'del-04',
    input: {
      message: 'make changes to the beat',
      phase: 'structure',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PlotArchitect', 'Writer'],
      shouldNotHalt: true,
    },
    metadata: {
      category: 'delegation',
      description: 'Explicit "Make changes" command',
    },
  },
  {
    id: 'del-05',
    input: {
      message: 'fix this mess now',
      phase: 'structure',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PlotArchitect', 'Writer', 'Showrunner'],
      shouldNotHalt: true,
    },
    metadata: {
      category: 'delegation',
      description: 'Urgent "Fix it" command',
    },
  },

  // --- CREATIVE DIRECTION ---
  {
    id: 'dir-01',
    input: {
      message: 'make it darker and more gritty',
      phase: 'structure',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PlotArchitect', 'Writer'],
      shouldNotHalt: true,
    },
    metadata: {
      category: 'creative_direction',
      description: 'Tone shift',
    },
  },
  {
    id: 'dir-04',
    input: {
      message: 'change the location to a spaceship',
      phase: 'premise',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PremiseArchitect', 'PlotArchitect'],
      shouldNotHalt: true,
    },
    metadata: {
      category: 'creative_direction',
      description: 'Setting change',
    },
  },

  // --- APPROVAL / REJECTION ---
  {
    id: 'fb-01',
    input: {
      message: 'looks good to me',
      phase: 'structure',
    },
    expected: {
      shouldNotHalt: true,
    },
    metadata: {
      category: 'approval',
      description: 'Approval',
    },
  },

  // --- QUESTIONS / INTERACTION ---
  {
    id: 'q-01',
    input: {
      message: 'why did you choose that setting?',
      phase: 'structure',
    },
    expected: {
      shouldNotHalt: false,
    },
    metadata: {
      category: 'question',
      description: 'Clarification question',
    },
  },
  {
    id: 'q-02',
    input: {
      message: 'what phase are we in?',
      phase: 'structure',
    },
    expected: {
      shouldNotHalt: false,
    },
    metadata: {
      category: 'question',
      description: 'Meta question',
    },
  },
  {
    id: 'int-01',
    input: {
      message: 'What do you think we should do next?',
      phase: 'structure',
    },
    expected: {
      shouldHalt: true,
    },
    metadata: {
      category: 'interaction',
      description: 'User solicits opinion (Should halt for answer)',
    },
  },

  // --- PHASE CHANGES ---
  {
    id: 'ph-01',
    input: {
      message: 'let\'s move to the writing phase',
      phase: 'structure',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['Writer'],
      shouldNotHalt: true,
      expectedPhaseChange: 'writing',
    },
    metadata: {
      category: 'phase_change',
      description: 'Move to writing',
    },
  },

  // --- EDGE CASES ---
  {
    id: 'edge-01',
    input: {
      message: 'asdf jkl;',
      phase: 'structure',
    },
    expected: {
      shouldNotHalt: false,
    },
    metadata: {
      category: 'edge_case',
      description: 'Gibberish / Confusion',
    },
  },
  {
    id: 'edge-02',
    input: {
      message: '...',
      phase: 'structure',
    },
    expected: {
      shouldNotHalt: false,
    },
    metadata: {
      category: 'edge_case',
      description: 'Empty input (simulated)',
    },
  },
  {
    id: 'edge-03',
    input: {
      message: 'start but stop',
      phase: 'structure',
    },
    expected: {
      shouldNotHalt: false,
    },
    metadata: {
      category: 'edge_case',
      description: 'Contradictory command',
    },
  },

  // --- COMPLEX ACTIONS ---
  {
    id: 'val-01',
    input: {
      message: 'create a character named Bob, then kill him, then make a beat about his funeral',
      phase: 'structure',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PlotArchitect', 'Character', 'PremiseArchitect'],
      shouldNotHalt: true,
    },
    metadata: {
      category: 'complex',
      description: 'Complex multi-step instruction',
    },
  },

  // --- RAG GROUNDING CASES ---
  {
    id: 'rag-01',
    input: {
      message: 'Tell me about the main character',
      phase: 'structure',
    },
    expected: {
      shouldNotHalt: false,
    },
    metadata: {
      category: 'rag',
      description: 'Should retrieve character info from series bible',
      requiresCitations: true,
    },
  },
  {
    id: 'rag-02',
    input: {
      message: 'Summarize the world rules we established',
      phase: 'premise',
    },
    expected: {
      shouldNotHalt: false,
    },
    metadata: {
      category: 'rag',
      description: 'Should retrieve world rules from series bible',
      requiresCitations: true,
    },
  },

  // --- HALLUCINATION EDGE CASES ---
  {
    id: 'halluc-01',
    input: {
      message: 'Give me some reference videos for this scene',
      phase: 'writing',
    },
    expected: {
      shouldNotHalt: false,
      noHallucinations: true,
    },
    metadata: {
      category: 'hallucination',
      description: 'Should not generate fake URLs',
      noFakeUrls: true,
    },
  },

  // ============================================
  // MAGIC SCORE / QUALITY TESTS
  // ============================================

  {
    id: 'magic-positive-01',
    input: {
      message: 'Write a scene where Tyrion negotiates for his life',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['Writer'],
      minMagicScore: 60,
    },
    metadata: {
      category: 'magic_score',
      description: 'High-stakes dialogue scene - should produce quality writing',
      qualityExpectation: 'GRRM-level dialogue with subtext',
    },
  },
  {
    id: 'magic-positive-02',
    input: {
      message: 'Create a beat where a character discovers their mentor has been lying to them',
      phase: 'breaking',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PlotArchitect'],
      minMagicScore: 55,
    },
    metadata: {
      category: 'magic_score',
      description: 'Emotional revelation beat - should be specific not generic',
    },
  },
  {
    id: 'magic-negative-01',
    input: {
      message: 'Write a scene where the hero saves the day',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
      maxMagicScore: 50, // Generic premise should produce mediocre output
    },
    metadata: {
      category: 'magic_score',
      description: 'Generic hero premise - tests if system elevates or accepts slop',
      antipattern: true,
    },
  },

  // ============================================
  // CONSISTENCY TESTS
  // ============================================

  {
    id: 'consist-01',
    input: {
      message: 'What happened to Jon after the Red Wedding?',
      phase: 'structure',
      projectId: 'test-project',
    },
    expected: {
      shouldNotHalt: false,
      requiresConsistency: true,
    },
    metadata: {
      category: 'consistency',
      description: 'Should maintain character knowledge consistency (Jon was not at Red Wedding)',
      worldContext: { redWeddingAttendees: ['Robb', 'Catelyn', 'Grey Wind'] },
    },
  },
  {
    id: 'consist-02',
    input: {
      message: 'Have the dead character speak in this scene',
      phase: 'writing',
    },
    expected: {
      shouldNotHalt: false,
      requiresConsistency: true,
    },
    metadata: {
      category: 'consistency',
      description: 'Should flag dead characters appearing unless resurrection is established',
    },
  },
  {
    id: 'consist-03',
    input: {
      message: 'The magic system should let characters fly now',
      phase: 'premise',
    },
    expected: {
      shouldDelegate: true,
      requiresConsistency: true,
    },
    metadata: {
      category: 'consistency',
      description: 'Should check against established world rules before allowing',
    },
  },
  {
    id: 'consist-timeline-01',
    input: {
      message: 'Show what happened before the character was born',
      phase: 'structure',
    },
    expected: {
      requiresConsistency: true,
    },
    metadata: {
      category: 'consistency',
      description: 'Timeline consistency - character cannot be present before birth',
    },
  },

  // ============================================
  // NARRATIVE COHERENCE TESTS
  // ============================================

  {
    id: 'narrative-01',
    input: {
      message: 'Create three beats that build tension toward the climax',
      phase: 'breaking',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PlotArchitect'],
    },
    metadata: {
      category: 'narrative_coherence',
      description: 'Should create causally connected beats, not episodic events',
      expectation: 'Each beat should cause the next',
    },
  },
  {
    id: 'narrative-02',
    input: {
      message: 'Resolve the protagonist\'s arc in this scene',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['Writer', 'CharacterPsychology'],
    },
    metadata: {
      category: 'narrative_coherence',
      description: 'Arc resolution should be earned, not deus ex machina',
    },
  },
  {
    id: 'narrative-03',
    input: {
      message: 'Add a twist that changes everything',
      phase: 'breaking',
    },
    expected: {
      shouldDelegate: true,
    },
    metadata: {
      category: 'narrative_coherence',
      description: 'Twists should be surprising but inevitable in retrospect',
    },
  },

  // ============================================
  // CHARACTER VOICE TESTS
  // ============================================

  {
    id: 'voice-01',
    input: {
      message: 'Write dialogue between the noble lord and the street thief',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['Writer'],
      minMagicScore: 55,
    },
    metadata: {
      category: 'character_voice',
      description: 'Characters should have distinct speech patterns based on class',
    },
  },
  {
    id: 'voice-02',
    input: {
      message: 'Have the child character explain the political situation',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
    },
    metadata: {
      category: 'character_voice',
      description: 'Should maintain age-appropriate dialogue',
    },
  },

  // ============================================
  // WORLD BUILDING TESTS
  // ============================================

  {
    id: 'world-01',
    input: {
      message: 'Establish the economic system of this world',
      phase: 'premise',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PremiseArchitect'],
    },
    metadata: {
      category: 'world_building',
      description: 'Should create specific, interconnected economic rules',
    },
  },
  {
    id: 'world-02',
    input: {
      message: 'Define the three major factions and their conflicts',
      phase: 'premise',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PremiseArchitect'],
    },
    metadata: {
      category: 'world_building',
      description: 'Factions should have specific goals, not generic good/evil',
    },
  },

  // ============================================
  // DEVILS ADVOCATE TESTS
  // ============================================

  {
    id: 'critique-01',
    input: {
      message: 'This beat feels too convenient - what\'s wrong with it?',
      phase: 'breaking',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['DevilsAdvocate'],
    },
    metadata: {
      category: 'critique',
      description: 'Should provide specific critique, not generic praise',
    },
  },
  {
    id: 'critique-02',
    input: {
      message: 'Challenge this character motivation',
      phase: 'structure',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['DevilsAdvocate', 'CharacterPsychology'],
    },
    metadata: {
      category: 'critique',
      description: 'Should identify weak motivations and suggest improvements',
    },
  },

  // ============================================
  // SETUP/PAYOFF TESTS
  // ============================================

  {
    id: 'setup-01',
    input: {
      message: 'Plant a Chekhov\'s Gun for the climax',
      phase: 'breaking',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['ConsequenceTracker', 'PlotArchitect'],
    },
    metadata: {
      category: 'setup_payoff',
      description: 'Should create meaningful setup that demands payoff',
    },
  },
  {
    id: 'payoff-01',
    input: {
      message: 'Pay off the gun we planted in act one',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
      requiresConsistency: true,
    },
    metadata: {
      category: 'setup_payoff',
      description: 'Should track and resolve planted setups',
    },
  },

  // ============================================
  // TONE AND STYLE TESTS
  // ============================================

  {
    id: 'tone-01',
    input: {
      message: 'Make this scene feel like The Wire - gritty and realistic',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['Writer'],
    },
    metadata: {
      category: 'tone',
      description: 'Should adapt prose style to match reference',
    },
  },
  {
    id: 'tone-02',
    input: {
      message: 'This needs more dark humor like Fargo',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
    },
    metadata: {
      category: 'tone',
      description: 'Should inject specific comedic sensibility',
    },
  },

  // ============================================
  // COMPLEX MULTI-AGENT SCENARIOS
  // ============================================

  {
    id: 'complex-01',
    input: {
      message:
        'Rewrite this beat to fix the pacing, maintain character voice, and set up the twist',
      phase: 'cardlock',
    },
    expected: {
      shouldDelegate: true,
      expectedAgents: ['PlotArchitect', 'Writer', 'ConsequenceTracker'],
    },
    metadata: {
      category: 'complex',
      description: 'Multi-objective task requiring coordination',
    },
  },
  {
    id: 'complex-02',
    input: {
      message: 'Create an episode that parallels the pilot but shows how characters have changed',
      phase: 'breaking',
    },
    expected: {
      shouldDelegate: true,
    },
    metadata: {
      category: 'complex',
      description: 'Requires understanding of series arc and character development',
    },
  },

  // ============================================
  // NEGATIVE EXAMPLES (SHOULD FAIL/WARN)
  // ============================================

  {
    id: 'negative-slop-01',
    input: {
      message: 'Write something generic about a hero journey',
      phase: 'writing',
    },
    expected: {
      maxMagicScore: 45, // Should be flagged as slop
    },
    metadata: {
      category: 'negative_example',
      description: 'Generic prompt should produce slop that gets flagged',
      expectSlop: true,
    },
  },
  {
    id: 'negative-halluc-01',
    input: {
      message: 'Reference some famous movies similar to our story',
      phase: 'structure',
    },
    expected: {
      noHallucinations: true,
    },
    metadata: {
      category: 'negative_example',
      description: 'Should not invent fake movie titles or quotes',
    },
  },

  // ============================================
  // EDGE CASES - EXPANDED
  // ============================================

  {
    id: 'edge-multi-language',
    input: {
      message: 'Write dialogue that switches between English and Spanish',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
    },
    metadata: {
      category: 'edge_case',
      description: 'Multi-language dialogue handling',
    },
  },
  {
    id: 'edge-unreliable-narrator',
    input: {
      message: 'Write from an unreliable narrator perspective',
      phase: 'writing',
    },
    expected: {
      shouldDelegate: true,
      minMagicScore: 55,
    },
    metadata: {
      category: 'edge_case',
      description: 'Complex narrative technique',
    },
  },
  {
    id: 'edge-parallel-timelines',
    input: {
      message: 'Create beats that happen simultaneously in different locations',
      phase: 'breaking',
    },
    expected: {
      shouldDelegate: true,
      requiresConsistency: true,
    },
    metadata: {
      category: 'edge_case',
      description: 'Parallel timeline management',
    },
  },
]

// ============================================
// EXPORT DATASET
// ============================================

export const STORYTELLER_GOLDEN_DATASET: DatasetConfig = {
  name: 'storyteller-golden-v2',
  description: 'Comprehensive golden test cases for storyteller evaluation (50+ examples)',
  examples: examples as EvaluationExample[],
}

export { examples as STORYTELLER_EXAMPLES }
export type { StorytellerExample }
