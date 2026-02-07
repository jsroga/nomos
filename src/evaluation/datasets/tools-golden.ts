/**
 * Tools Golden Dataset
 *
 * Test cases for evaluating the new storyteller tools:
 * - manage_beat (Beat CRUD operations)
 * - check_continuity (Continuity validation)
 * - analyze_relationships (Character relationship analysis)
 */

import { DatasetConfig, EvaluationExample } from '../types'
import {
  WritersRoomState,
  BeatCard,
  CharacterState,
  Setup,
} from '../../domains/storyteller/graph/state'
import { BeatType, BeatStatus } from '../../domains/storyteller/enums'
import { DEFAULT_CHARACTER_METRICS } from '../../domains/storyteller/graph/state'

// Tool-specific input type
export interface ToolEvalInput {
  tool:
    | 'manage_beat'
    | 'check_continuity'
    | 'analyze_relationships'
    | 'list_beats'
    | 'quick_consistency_check'
  args: Record<string, unknown>
  stateOverrides?: Partial<WritersRoomState>
}

// Tool-specific expected output type
export interface ToolEvalExpected {
  success: boolean
  outputContains?: string[]
  outputNotContains?: string[]
  hasField?: string[]
  fieldValue?: Record<string, unknown>
  errorContains?: string
}

export interface ToolExample extends EvaluationExample {
  input: ToolEvalInput & Record<string, unknown>
  expected: ToolEvalExpected & Record<string, unknown>
}

// ========================================
// MOCK DATA FACTORIES
// ========================================

export function createMockBeat(overrides?: Partial<BeatCard>): BeatCard {
  return {
    id: 'beat-' + Math.random().toString(36).substring(7),
    episodeId: 'ep-001',
    sequence: 1,
    logline: 'Test beat logline',
    beatType: BeatType.DEFAULT,
    charactersInvolved: [],
    emotionalShifts: {},
    visualHook: '',
    causalDependencies: [],
    setupsPayoffs: {},
    status: BeatStatus.PROPOSED,
    ...overrides,
  }
}

export function createMockCharacter(overrides?: Partial<CharacterState>): CharacterState {
  return {
    characterId: 'char-' + Math.random().toString(36).substring(7),
    name: 'Test Character',
    currentGoals: ['Survive', 'Find truth'],
    fears: ['Death', 'Betrayal'],
    selfDelusion: 'I am always right',
    actualMotivation: 'Power',
    knowledgeState: [],
    metrics: { ...DEFAULT_CHARACTER_METRICS },
    metricsHistory: [],
    ...overrides,
  }
}

export function createMockSetup(overrides?: Partial<Setup>): Setup {
  return {
    id: 'setup-' + Math.random().toString(36).substring(7),
    description: 'Test setup',
    beatId: 'beat-001',
    isResolved: false,
    ...overrides,
  }
}

// Pre-defined state configurations for tests
export const STATE_CONFIGS = {
  // Empty state - no beats, no characters
  empty: {
    beatBoard: [],
    characters: [],
    seriesBible: {},
    unresolvedSetups: [],
  },

  // State with some beats
  withBeats: {
    beatBoard: [
      createMockBeat({
        id: 'beat-001',
        sequence: 1,
        logline: 'Hero receives the call',
        status: BeatStatus.APPROVED,
      }),
      createMockBeat({
        id: 'beat-002',
        sequence: 2,
        logline: 'Hero crosses threshold',
        status: BeatStatus.PROPOSED,
      }),
      createMockBeat({
        id: 'beat-003',
        sequence: 3,
        logline: 'Hero meets mentor',
        status: BeatStatus.LOCKED,
      }),
    ],
    characters: [],
    seriesBible: {},
    unresolvedSetups: [],
  },

  // State with characters for relationship tests
  withCharacters: {
    beatBoard: [
      createMockBeat({
        id: 'beat-001',
        sequence: 1,
        logline: 'Alice confronts Bob',
        charactersInvolved: ['Alice', 'Bob'],
        emotionalShifts: {
          Alice: { from: 'calm', to: 'angry' },
          Bob: { from: 'confident', to: 'fearful' },
        },
      }),
      createMockBeat({
        id: 'beat-002',
        sequence: 2,
        logline: 'Charlie mediates',
        charactersInvolved: ['Alice', 'Bob', 'Charlie'],
      }),
    ],
    characters: [
      createMockCharacter({
        characterId: 'char-alice',
        name: 'Alice',
        currentGoals: ['Justice', 'Revenge'],
        fears: ['Losing control'],
        metrics: { ...DEFAULT_CHARACTER_METRICS, valence: -20, arousal: 70 },
      }),
      createMockCharacter({
        characterId: 'char-bob',
        name: 'Bob',
        currentGoals: ['Escape', 'Hide truth'],
        fears: ['Exposure', 'Alice'],
        metrics: { ...DEFAULT_CHARACTER_METRICS, valence: -40, arousal: 80 },
      }),
      createMockCharacter({
        characterId: 'char-charlie',
        name: 'Charlie',
        currentGoals: ['Peace', 'Unity'],
        fears: ['Conflict'],
        metrics: { ...DEFAULT_CHARACTER_METRICS, valence: 30, relatedness: 80 },
      }),
    ],
    seriesBible: {
      factions: [
        { name: 'The Seekers', members: ['Alice', 'Charlie'] },
        { name: 'The Hidden', members: ['Bob'] },
      ],
    },
    unresolvedSetups: [],
  },

  // State with world rules for continuity tests
  withWorldRules: {
    beatBoard: [
      createMockBeat({
        id: 'beat-001',
        sequence: 1,
        logline: 'Wizard casts fire spell',
        charactersInvolved: ['Merlin'],
      }),
    ],
    characters: [createMockCharacter({ name: 'Merlin' })],
    seriesBible: {
      worldRules: [
        { rule: 'Magic cannot resurrect the dead', consequence: 'Death is permanent' },
        { rule: 'Vampires cannot enter homes uninvited', consequence: 'They burn if they try' },
        { rule: 'Time travel is impossible', consequence: 'No paradoxes' },
      ],
      themes: ['Power', 'Sacrifice'],
    },
    unresolvedSetups: [
      createMockSetup({
        id: 'setup-001',
        description: 'Merlin hides a secret',
        beatId: 'beat-001',
      }),
    ],
  },

  // State with continuity issues
  withContinuityIssues: {
    beatBoard: [
      createMockBeat({
        id: 'beat-001',
        sequence: 1,
        logline: 'Hero dies in battle',
        charactersInvolved: ['Hero'],
      }),
      createMockBeat({
        id: 'beat-002',
        sequence: 2,
        logline: 'Hero resurrects using magic',
        charactersInvolved: ['Hero'],
      }),
      createMockBeat({
        id: 'beat-003',
        sequence: 3,
        logline: 'Vampire enters the house uninvited',
        charactersInvolved: ['Vampire'],
        setupsPayoffs: { payoffFor: 'nonexistent-setup' }, // Orphaned payoff
      }),
    ],
    characters: [],
    seriesBible: {
      worldRules: [
        { rule: 'Magic cannot resurrect the dead', consequence: 'Death is permanent' },
        { rule: 'Vampires cannot enter homes uninvited', consequence: 'They burn' },
      ],
    },
    unresolvedSetups: [
      createMockSetup({
        id: 'setup-orphan',
        description: 'Chekhov gun',
        beatId: 'beat-001',
        isResolved: false,
      }),
    ],
  },
}

// ========================================
// TEST CASES: manage_beat
// ========================================

const manageBeatExamples: ToolExample[] = [
  // Happy path: Create
  {
    id: 'beat-create-01',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'create',
        data: { logline: 'Hero enters the dark cave' },
      },
      stateOverrides: STATE_CONFIGS.empty,
    },
    expected: {
      success: true,
      outputContains: ['created', 'beat', 'Hero enters'],
      hasField: ['beat'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'create',
      type: 'happy_path',
    },
  },

  // Happy path: Create at specific position
  {
    id: 'beat-create-position',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'create',
        data: { logline: 'Inserted beat' },
        targetPosition: 2,
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: true,
      outputContains: ['created', 'position 2'],
      hasField: ['beat'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'create',
      type: 'edge_case',
    },
  },

  // Happy path: Update
  {
    id: 'beat-update-01',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'update',
        beatId: 'beat-002',
        data: { logline: 'Updated logline here', visualHook: 'A dramatic shadow' },
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: true,
      outputContains: ['Updated', 'beat'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'update',
      type: 'happy_path',
    },
  },

  // Edge case: Update locked beat
  {
    id: 'beat-update-locked',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'update',
        beatId: 'beat-003', // This is LOCKED in withBeats
        data: { logline: 'Trying to change locked beat' },
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: false,
      outputContains: ['locked'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'update',
      type: 'edge_case',
    },
  },

  // Error case: Update missing beat
  {
    id: 'beat-update-missing',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'update',
        beatId: 'nonexistent-beat',
        data: { logline: 'Will fail' },
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: false,
      outputContains: ['not found'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'update',
      type: 'error_case',
    },
  },

  // Happy path: Delete
  {
    id: 'beat-delete-01',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'delete',
        beatId: 'beat-002',
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: true,
      outputContains: ['Deleted', 'beat'],
      hasField: ['deletedId'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'delete',
      type: 'happy_path',
    },
  },

  // Edge case: Delete locked beat
  {
    id: 'beat-delete-locked',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'delete',
        beatId: 'beat-003', // LOCKED
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: false,
      outputContains: ['locked'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'delete',
      type: 'edge_case',
    },
  },

  // Happy path: Move
  {
    id: 'beat-move-01',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'move',
        beatId: 'beat-001',
        targetPosition: 3,
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: true,
      outputContains: ['Moved', 'position'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'move',
      type: 'happy_path',
    },
  },

  // Happy path: List
  {
    id: 'beat-list-01',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'list',
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: true,
      hasField: ['beats', 'totalBeats', 'statusCounts'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'list',
      type: 'happy_path',
    },
  },

  // Edge case: List empty
  {
    id: 'beat-list-empty',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'list',
      },
      stateOverrides: STATE_CONFIGS.empty,
    },
    expected: {
      success: true,
      fieldValue: { totalBeats: 0 },
    },
    metadata: {
      category: 'manage_beat',
      operation: 'list',
      type: 'edge_case',
    },
  },

  // Happy path: Approve
  {
    id: 'beat-approve-01',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'approve',
        beatId: 'beat-002',
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: true,
      outputContains: ['Approved'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'approve',
      type: 'happy_path',
    },
  },

  // Happy path: Duplicate
  {
    id: 'beat-duplicate-01',
    input: {
      tool: 'manage_beat',
      args: {
        operation: 'duplicate',
        beatId: 'beat-001',
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: true,
      outputContains: ['Duplicated'],
      hasField: ['newBeat'],
    },
    metadata: {
      category: 'manage_beat',
      operation: 'duplicate',
      type: 'happy_path',
    },
  },
]

// ========================================
// TEST CASES: check_continuity
// ========================================

const checkContinuityExamples: ToolExample[] = [
  // Happy path: Clean pass
  {
    id: 'cont-clean-01',
    input: {
      tool: 'check_continuity',
      args: {
        scope: 'all_beats',
        checkTypes: ['all'],
      },
      stateOverrides: STATE_CONFIGS.withBeats,
    },
    expected: {
      success: true,
      hasField: ['summary'],
    },
    metadata: {
      category: 'check_continuity',
      type: 'happy_path',
    },
  },

  // Detect world rule violation
  {
    id: 'cont-world-rule-violation',
    input: {
      tool: 'check_continuity',
      args: {
        scope: 'all_beats',
        checkTypes: ['world_rules'],
      },
      stateOverrides: STATE_CONFIGS.withContinuityIssues,
    },
    expected: {
      success: true,
      hasField: ['issues'],
      // Should detect resurrection violation
    },
    metadata: {
      category: 'check_continuity',
      type: 'detection',
      description: 'Should detect magic resurrection violating world rule',
    },
  },

  // Detect orphaned payoff
  {
    id: 'cont-orphaned-payoff',
    input: {
      tool: 'check_continuity',
      args: {
        scope: 'all_beats',
        checkTypes: ['setup_payoff'],
      },
      stateOverrides: STATE_CONFIGS.withContinuityIssues,
    },
    expected: {
      success: true,
      hasField: ['issues'],
    },
    metadata: {
      category: 'check_continuity',
      type: 'detection',
      description: 'Should detect payoff referencing non-existent setup',
    },
  },

  // Empty beats - no error
  {
    id: 'cont-no-beats',
    input: {
      tool: 'check_continuity',
      args: {
        scope: 'all_beats',
        checkTypes: ['all'],
      },
      stateOverrides: STATE_CONFIGS.empty,
    },
    expected: {
      success: true,
      outputContains: ['No beats'],
    },
    metadata: {
      category: 'check_continuity',
      type: 'edge_case',
    },
  },

  // Specific beats scope
  {
    id: 'cont-specific-beats',
    input: {
      tool: 'check_continuity',
      args: {
        scope: 'specific_beats',
        beatIds: ['beat-001', 'beat-002'],
        checkTypes: ['world_rules'],
      },
      stateOverrides: STATE_CONFIGS.withContinuityIssues,
    },
    expected: {
      success: true,
      hasField: ['summary'],
    },
    metadata: {
      category: 'check_continuity',
      type: 'edge_case',
    },
  },
]

// ========================================
// TEST CASES: analyze_relationships
// ========================================

const analyzeRelationshipsExamples: ToolExample[] = [
  // Happy path: Full matrix
  {
    id: 'rel-matrix-01',
    input: {
      tool: 'analyze_relationships',
      args: {
        focus: 'full_matrix',
        includeHistory: false,
      },
      stateOverrides: STATE_CONFIGS.withCharacters,
    },
    expected: {
      success: true,
      hasField: ['totalCharacters', 'totalRelationships', 'relationships', 'clusters'],
    },
    metadata: {
      category: 'analyze_relationships',
      focus: 'full_matrix',
      type: 'happy_path',
    },
  },

  // Happy path: Character focus
  {
    id: 'rel-character-focus-01',
    input: {
      tool: 'analyze_relationships',
      args: {
        focus: 'character_focus',
        characterName: 'Alice',
      },
      stateOverrides: STATE_CONFIGS.withCharacters,
    },
    expected: {
      success: true,
      hasField: ['character', 'relationships'],
    },
    metadata: {
      category: 'analyze_relationships',
      focus: 'character_focus',
      type: 'happy_path',
    },
  },

  // Happy path: Cluster analysis
  {
    id: 'rel-clusters-01',
    input: {
      tool: 'analyze_relationships',
      args: {
        focus: 'cluster_analysis',
      },
      stateOverrides: STATE_CONFIGS.withCharacters,
    },
    expected: {
      success: true,
      hasField: ['clusters', 'isolatedCharacters'],
    },
    metadata: {
      category: 'analyze_relationships',
      focus: 'cluster_analysis',
      type: 'happy_path',
    },
  },

  // Happy path: Evolution tracking
  {
    id: 'rel-evolution-01',
    input: {
      tool: 'analyze_relationships',
      args: {
        focus: 'evolution',
      },
      stateOverrides: STATE_CONFIGS.withCharacters,
    },
    expected: {
      success: true,
      hasField: ['timeline', 'totalChanges'],
    },
    metadata: {
      category: 'analyze_relationships',
      focus: 'evolution',
      type: 'happy_path',
    },
  },

  // Edge case: Character not found
  {
    id: 'rel-character-not-found',
    input: {
      tool: 'analyze_relationships',
      args: {
        focus: 'character_focus',
        characterName: 'NonExistent',
      },
      stateOverrides: STATE_CONFIGS.withCharacters,
    },
    expected: {
      success: true,
      outputContains: ['no established relationships'],
    },
    metadata: {
      category: 'analyze_relationships',
      focus: 'character_focus',
      type: 'edge_case',
    },
  },

  // Edge case: Single character (not enough for relationships)
  {
    id: 'rel-single-char',
    input: {
      tool: 'analyze_relationships',
      args: {
        focus: 'full_matrix',
      },
      stateOverrides: {
        ...STATE_CONFIGS.empty,
        characters: [createMockCharacter({ name: 'Solo' })],
      },
    },
    expected: {
      success: false,
      outputContains: ['at least 2 characters'],
    },
    metadata: {
      category: 'analyze_relationships',
      type: 'edge_case',
    },
  },

  // With history
  {
    id: 'rel-with-history',
    input: {
      tool: 'analyze_relationships',
      args: {
        focus: 'full_matrix',
        includeHistory: true,
      },
      stateOverrides: STATE_CONFIGS.withCharacters,
    },
    expected: {
      success: true,
      hasField: ['relationships'],
    },
    metadata: {
      category: 'analyze_relationships',
      type: 'happy_path',
      description: 'Include relationship history in output',
    },
  },
]

// ========================================
// COMBINED DATASET
// ========================================

export const TOOLS_DATASET: DatasetConfig = {
  name: 'storyteller-tools-golden',
  description:
    'Golden test cases for storyteller tools: manage_beat, check_continuity, analyze_relationships',
  examples: [...manageBeatExamples, ...checkContinuityExamples, ...analyzeRelationshipsExamples],
}

// Export individual datasets for targeted testing
export const MANAGE_BEAT_DATASET: DatasetConfig = {
  name: 'storyteller-tools-manage-beat',
  description: 'Test cases for manage_beat tool',
  examples: manageBeatExamples,
}

export const CONTINUITY_DATASET: DatasetConfig = {
  name: 'storyteller-tools-continuity',
  description: 'Test cases for check_continuity tool',
  examples: checkContinuityExamples,
}

export const RELATIONSHIPS_DATASET: DatasetConfig = {
  name: 'storyteller-tools-relationships',
  description: 'Test cases for analyze_relationships tool',
  examples: analyzeRelationshipsExamples,
}
