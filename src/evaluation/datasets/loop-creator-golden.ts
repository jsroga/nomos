/**
 * Loop Creator Golden Dataset
 *
 * Test cases for evaluating the game loop creator agent's behavior.
 */

import { DatasetConfig, EvaluationExample, LoopCreatorEvalInput } from '../types'

interface LoopCreatorExample extends EvaluationExample {
  input: LoopCreatorEvalInput & Record<string, unknown>
  expected: {
    shouldGenerateMechanics?: boolean
    shouldAnalyzeBalance?: boolean
    shouldCreateLoop?: boolean
    expectedMechanicTypes?: string[]
    minBalanceScore?: number
  } & Record<string, unknown>
}

const examples: LoopCreatorExample[] = [
  // --- BASIC MECHANICS GENERATION ---
  {
    id: 'mech-01',
    input: {
      message: 'Create a resource gathering mechanic',
      gameContext: {
        genre: 'survival',
        platform: 'PC',
        audience: 'casual',
      },
    },
    expected: {
      shouldGenerateMechanics: true,
      expectedMechanicTypes: ['resource_gathering', 'input'],
    },
    metadata: {
      category: 'mechanics',
      description: 'Basic resource gathering mechanic',
    },
  },
  {
    id: 'mech-02',
    input: {
      message: 'Add a crafting system that uses gathered resources',
      gameContext: {
        genre: 'survival',
        platform: 'PC',
        audience: 'casual',
      },
    },
    expected: {
      shouldGenerateMechanics: true,
      expectedMechanicTypes: ['crafting', 'transformer'],
    },
    metadata: {
      category: 'mechanics',
      description: 'Crafting system with resource dependency',
    },
  },

  // --- LOOP CREATION ---
  {
    id: 'loop-01',
    input: {
      message: 'Create a core gameplay loop for a farming game',
      gameContext: {
        genre: 'farming_sim',
        platform: 'mobile',
        audience: 'casual',
      },
    },
    expected: {
      shouldCreateLoop: true,
    },
    metadata: {
      category: 'loop_creation',
      description: 'Core loop for farming game',
    },
  },
  {
    id: 'loop-02',
    input: {
      message: 'Design a meta-progression loop that spans multiple play sessions',
      gameContext: {
        genre: 'roguelike',
        platform: 'PC',
        audience: 'hardcore',
      },
    },
    expected: {
      shouldCreateLoop: true,
    },
    metadata: {
      category: 'loop_creation',
      description: 'Meta-progression loop',
    },
  },

  // --- BALANCE ANALYSIS ---
  {
    id: 'balance-01',
    input: {
      message: 'Analyze the balance of the current game loops',
      gameContext: {
        genre: 'action_rpg',
        platform: 'console',
        audience: 'mid-core',
      },
    },
    expected: {
      shouldAnalyzeBalance: true,
      minBalanceScore: 5,
    },
    metadata: {
      category: 'balance',
      description: 'Balance analysis request',
    },
  },
  {
    id: 'balance-02',
    input: {
      message: 'Check if there are any dead ends in the current loop structure',
      gameContext: {
        genre: 'strategy',
        platform: 'PC',
        audience: 'hardcore',
      },
    },
    expected: {
      shouldAnalyzeBalance: true,
    },
    metadata: {
      category: 'balance',
      description: 'Dead end detection',
    },
  },

  // --- COMPLEX MULTI-STEP ---
  {
    id: 'complex-01',
    input: {
      message: 'Design a complete economy system with resource gathering, crafting, and trading',
      gameContext: {
        genre: 'mmo',
        platform: 'PC',
        audience: 'mid-core',
      },
    },
    expected: {
      shouldGenerateMechanics: true,
      shouldCreateLoop: true,
      expectedMechanicTypes: ['resource_gathering', 'crafting', 'trading'],
    },
    metadata: {
      category: 'complex',
      description: 'Full economy system',
    },
  },

  // --- EDGE CASES ---
  {
    id: 'edge-01',
    input: {
      message: 'What is a game loop?',
      gameContext: {
        genre: 'unknown',
        platform: 'unknown',
        audience: 'unknown',
      },
    },
    expected: {
      shouldGenerateMechanics: false,
      shouldCreateLoop: false,
    },
    metadata: {
      category: 'edge_case',
      description: 'Question about concepts (should not generate)',
    },
  },
  {
    id: 'edge-02',
    input: {
      message: 'Remove all mechanics',
      gameContext: {
        genre: 'puzzle',
        platform: 'mobile',
        audience: 'casual',
      },
    },
    expected: {
      shouldGenerateMechanics: false,
    },
    metadata: {
      category: 'edge_case',
      description: 'Destructive command',
    },
  },

  // --- CONSISTENCY CASES ---
  {
    id: 'consist-01',
    input: {
      message: 'Add a mechanic that rewards the player for exploration',
      gameContext: {
        genre: 'open_world',
        platform: 'console',
        audience: 'mid-core',
      },
    },
    expected: {
      shouldGenerateMechanics: true,
    },
    metadata: {
      category: 'consistency',
      description: 'Should connect to existing exploration mechanics',
      requiresConsistency: true,
    },
  },

  // --- PSYCHOLOGICAL HOOK CASES ---
  {
    id: 'hook-01',
    input: {
      message: 'Create a compulsion loop for daily login rewards',
      gameContext: {
        genre: 'mobile_rpg',
        platform: 'mobile',
        audience: 'casual',
      },
    },
    expected: {
      shouldCreateLoop: true,
    },
    metadata: {
      category: 'psychological_hook',
      description: 'Short-term compulsion loop with daily hook',
    },
  },
  {
    id: 'hook-02',
    input: {
      message: 'Design a social loop that encourages friend invites',
      gameContext: {
        genre: 'casual_puzzle',
        platform: 'mobile',
        audience: 'casual',
      },
    },
    expected: {
      shouldCreateLoop: true,
    },
    metadata: {
      category: 'psychological_hook',
      description: 'Social hook for viral growth',
    },
  },

  // --- BALANCE EDGE CASES ---
  {
    id: 'balance-edge-01',
    input: {
      message: 'Create an intentionally grindy mechanic for hardcore players',
      gameContext: {
        genre: 'mmorpg',
        platform: 'PC',
        audience: 'hardcore',
      },
    },
    expected: {
      shouldGenerateMechanics: true,
      minBalanceScore: 4,
    },
    metadata: {
      category: 'balance_edge',
      description: 'High effort mechanic for hardcore audience',
    },
  },
  {
    id: 'balance-edge-02',
    input: {
      message: 'Analyze a pay-to-win mechanic and suggest fixes',
      gameContext: {
        genre: 'mobile_rpg',
        platform: 'mobile',
        audience: 'mid-core',
      },
    },
    expected: {
      shouldAnalyzeBalance: true,
    },
    metadata: {
      category: 'balance_edge',
      description: 'Monetization balance analysis',
    },
  },

  // --- LOOP STRUCTURE EDGE CASES ---
  {
    id: 'structure-01',
    input: {
      message: 'Create a loop with multiple entry points',
      gameContext: {
        genre: 'open_world',
        platform: 'console',
        audience: 'mid-core',
      },
    },
    expected: {
      shouldCreateLoop: true,
    },
    metadata: {
      category: 'loop_structure',
      description: 'Complex loop with multiple entry nodes',
    },
  },
  {
    id: 'structure-02',
    input: {
      message: 'Design nested loops - a session loop containing minute loops',
      gameContext: {
        genre: 'roguelike',
        platform: 'PC',
        audience: 'hardcore',
      },
    },
    expected: {
      shouldCreateLoop: true,
    },
    metadata: {
      category: 'loop_structure',
      description: 'Nested loop hierarchy',
    },
  },

  // --- INVALID/AMBIGUOUS REQUESTS ---
  {
    id: 'invalid-01',
    input: {
      message: 'Make the game fun',
      gameContext: {
        genre: 'unknown',
        platform: 'unknown',
        audience: 'unknown',
      },
    },
    expected: {
      shouldGenerateMechanics: false,
      shouldCreateLoop: false,
    },
    metadata: {
      category: 'edge_case',
      description: 'Vague request - should ask for clarification',
    },
  },
  {
    id: 'invalid-02',
    input: {
      message: 'Add a mechanic that breaks the game economy',
      gameContext: {
        genre: 'economy_sim',
        platform: 'PC',
        audience: 'mid-core',
      },
    },
    expected: {
      shouldGenerateMechanics: false,
    },
    metadata: {
      category: 'edge_case',
      description: 'Intentionally harmful request - should refuse or warn',
    },
  },

  // --- AUDIENCE-SPECIFIC CASES ---
  {
    id: 'audience-01',
    input: {
      message: 'Create a simple one-tap mechanic for very casual players',
      gameContext: {
        genre: 'hyper_casual',
        platform: 'mobile',
        audience: 'casual',
      },
    },
    expected: {
      shouldGenerateMechanics: true,
    },
    metadata: {
      category: 'audience',
      description: 'Ultra-casual mechanic with minimal friction',
    },
  },
  {
    id: 'audience-02',
    input: {
      message: 'Design a complex build optimization system',
      gameContext: {
        genre: 'arpg',
        platform: 'PC',
        audience: 'hardcore',
      },
    },
    expected: {
      shouldGenerateMechanics: true,
    },
    metadata: {
      category: 'audience',
      description: 'Deep mechanics for theorycrafters',
    },
  },

  // --- GENRE-SPECIFIC CASES ---
  {
    id: 'genre-01',
    input: {
      message: 'Create a deck-building loop for a roguelike card game',
      gameContext: {
        genre: 'roguelike_deckbuilder',
        platform: 'PC',
        audience: 'mid-core',
      },
    },
    expected: {
      shouldCreateLoop: true,
      shouldGenerateMechanics: true,
    },
    metadata: {
      category: 'genre',
      description: 'Deckbuilder core loop (like Slay the Spire)',
    },
  },
  {
    id: 'genre-02',
    input: {
      message: 'Design an auto-battler loop with team composition mechanics',
      gameContext: {
        genre: 'auto_battler',
        platform: 'mobile',
        audience: 'mid-core',
      },
    },
    expected: {
      shouldCreateLoop: true,
      shouldGenerateMechanics: true,
    },
    metadata: {
      category: 'genre',
      description: 'Auto-battler loop (like TFT)',
    },
  },

  // --- HARVEST-CRAFT-SELL SPECIFIC ---
  {
    id: 'hcs-01',
    input: {
      message: 'Create a Harvest -> Craft -> Sell core loop',
      gameContext: {
        genre: 'farming_sim',
        platform: 'PC',
        audience: 'casual',
      },
    },
    expected: {
      shouldCreateLoop: true,
      shouldGenerateMechanics: true,
      expectedMechanicTypes: ['harvest', 'craft', 'sell'],
    },
    metadata: {
      category: 'hcs_loop',
      description: 'Classic farming loop pattern',
    },
  },
  {
    id: 'hcs-02',
    input: {
      message: 'Add a time-gated growth mechanic to the farming loop',
      gameContext: {
        genre: 'farming_sim',
        platform: 'mobile',
        audience: 'casual',
      },
    },
    expected: {
      shouldGenerateMechanics: true,
    },
    metadata: {
      category: 'hcs_loop',
      description: 'Time-gating for session management',
    },
  },
]

export const LOOP_CREATOR_DATASET: DatasetConfig = {
  name: 'loop-creator-golden-v1',
  description: 'Golden test cases for loop creator agent evaluation',
  examples: examples as EvaluationExample[],
}

export { examples as LOOP_CREATOR_EXAMPLES }
