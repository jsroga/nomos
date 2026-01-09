/**
 * Storyteller Golden Dataset
 * 
 * Test cases for evaluating the storyteller agent's behavior.
 * Derived from e2e/test-cases.ts with enhanced structure for LangSmith.
 */

import { DatasetConfig, EvaluationExample, StorytellerEvalInput } from '../types'

interface StorytellerExample extends EvaluationExample {
  input: StorytellerEvalInput & Record<string, unknown>
  expected: {
    shouldDelegate?: boolean
    expectedAgents?: string[]
    shouldNotHalt?: boolean
    shouldHalt?: boolean
    expectedActions?: string[]
    expectedPhaseChange?: string
  } & Record<string, unknown>
}

const examples: StorytellerExample[] = [
  // --- DELEGATION (The "Go" Signal) ---
  {
    id: 'del-01',
    input: {
      message: "let's start working on this episode",
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
      message: "let's move to the writing phase",
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
    },
    metadata: {
      category: 'hallucination',
      description: 'Should not generate fake URLs',
      noFakeUrls: true,
    },
  },
]

export const STORYTELLER_DATASET: DatasetConfig = {
  name: 'storyteller-golden-v1',
  description: 'Golden test cases for storyteller agent evaluation',
  examples: examples as EvaluationExample[],
}

export { examples as STORYTELLER_EXAMPLES }

