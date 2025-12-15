import { BeatCard, CharacterState, Setup } from '../graph/state'

// ============================================
// AGENT ACTIONS - Operations agents can commit
// ============================================

export type AgentAction =
  // Beat Operations
  | { type: 'CREATE_BEAT'; payload: Partial<BeatCard> & { logline: string } }
  | { type: 'UPDATE_BEAT'; payload: { beatId: string; updates: Partial<BeatCard> } }
  | { type: 'DELETE_BEAT'; payload: { beatId: string } }
  | { type: 'REORDER_BEATS'; payload: { beatIds: string[] } }
  | { type: 'LOCK_BEAT_BOARD'; payload: { episodeId: string } }

  // Character Operations
  | { type: 'CREATE_CHARACTER'; payload: { name: string; role: string; description?: string } }
  | { type: 'UPDATE_CHARACTER'; payload: { characterId: string; updates: Record<string, any> } }
  | {
    type: 'UPDATE_CHARACTER_METRICS'
    payload: {
      characterId: string
      changes: Partial<
        Record<
          | 'valence'
          | 'arousal'
          | 'autonomy'
          | 'competence'
          | 'relatedness'
          | 'cognitiveClarity'
          | 'perceivedStakes'
          | 'socialSafety'
          | 'moralAlignment',
          number
        >
      >
      reason?: string
    }
  }
  | {
    type: 'UPDATE_STRESS_LEVEL'
    payload: { characterId: string; delta: number; reason?: string }
  } // Deprecated: use UPDATE_CHARACTER_METRICS
  | { type: 'ADD_KNOWLEDGE'; payload: { characterId: string; knowledge: string } }

  // Script Operations
  | { type: 'UPDATE_SCRIPT'; payload: { content: string; beatId?: string } }
  | { type: 'INSERT_SCRIPT_SECTION'; payload: { afterBeatId: string; content: string } }
  | { type: 'REVISE_SCRIPT_SECTION'; payload: { beatId: string; newContent: string } }

  // Story Bible Operations
  | {
    type: 'UPDATE_SERIES_BIBLE'
    payload: {
      genre?: string
      tone?: string
      themes?: string[]
      worldRules?: any[] // Relaxed to support WorldRule objects or strings
      factions?: any[] // Support Faction objects
      keyCharacters?: any[]
      storyPlan?: any // Support full story plan object
    }
  }
  | { type: 'ADD_WORLD_RULE'; payload: { rule: string } }
  | { type: 'ADD_SETUP'; payload: { description: string; beatId: string } }
  | { type: 'RESOLVE_SETUP'; payload: { setupId: string; payoffBeatId: string } }

  // Partial Bible Update Operations (Smart Merge)
  | {
    type: 'UPDATE_WORLD_RULES'
    payload: {
      rules: Array<{ category: string; rule: string; consequence: string; exceptions?: string | null }>
      mergeMode: 'replace' | 'merge' | 'smart'
    }
  }
  | {
    type: 'UPDATE_FACTIONS'
    payload: {
      factions: Array<{ id: string; name: string; ideology: string; goals: string[]; resources: string; weaknesses?: string | null; rivals?: string[] | null }>
      mergeMode: 'replace' | 'merge' | 'smart'
    }
  }
  | {
    type: 'UPDATE_INSPIRATIONS'
    payload: {
      inspirations: { books?: string[]; movies?: string[]; games?: string[] }
      mergeMode?: 'replace' | 'merge'
    }
  }
  | {
    type: 'UPDATE_WORLD_DESCRIPTION'
    payload: { description: string }
  }
  | {
    type: 'UPDATE_MOOD_SOUNDTRACK'
    payload: { moodSoundtrack: string }
  }
  | {
    type: 'UPDATE_PLOT_TWISTS'
    payload: {
      plotTwists: string[]
      mergeMode?: 'replace' | 'merge'
    }
  }
  | {
    type: 'UPDATE_KEY_CHARACTERS'
    payload: {
      keyCharacters: Array<{ name: string; role: string; archetype: string; motivation: string; factionId?: string | null }>
      mergeMode: 'replace' | 'merge' | 'smart'
    }
  }
  | {
    type: 'UPDATE_EPISODE_ROADMAP'
    payload: {
      sequences: Array<{ id: number; name: string; description: string; keyFactionsInvolved?: string[]; worldConsequence?: string }>
      mergeMode?: 'replace' | 'merge'
    }
  }
  | {
    type: 'UPDATE_EPISODE_PREMISE'
    payload: {
      episodeId?: string
      premise: {
        // Core identification
        title?: string
        logline?: string
        // Ozymandias Framework fields
        theHook?: string
        theTurn?: string
        theAftermath?: string
        // Character-focused fields
        protagonistHook?: string | null
        fatalFlaw?: string
        stakes?: string
        transformation?: string
        inevitableConsequence?: string
        // Meta
        thematicFocus?: string
        charactersInvolved?: string[]
      }
    }
  }

// ============================================
// AGENT QUESTIONS - Interactive user prompts
// ============================================

export type QuestionType = 'single_choice' | 'multiple_choice' | 'free_text' | 'confirmation'
export type QuestionUrgency = 'blocking' | 'important' | 'optional'

export interface QuestionOption {
  id: string
  label: string
  description?: string
  consequence?: string // What happens if selected
  recommended?: boolean
}

export interface AgentQuestion {
  id: string
  agentName: string
  question: string
  questionType: QuestionType
  options?: QuestionOption[]
  context?: string // Why the agent is asking
  urgency: QuestionUrgency
  defaultOption?: string
  timeout?: number // Auto-select default after X seconds (optional)
}

// ============================================
// AGENT RESPONSE - Structured output from agents
// ============================================

export interface AgentResponse {
  message: string // What the agent says to the user
  thinking?: string // Optional chain-of-thought (for transparency)
  actions: AgentAction[] // Actions to commit
  questions?: AgentQuestion[] // Questions for user
  suggestions?: string[] // Non-blocking suggestions
  confidence: number // 0-1 confidence in the response
  nextAgent?: string // Suggest which agent should respond next
}

// ============================================
// ACTION HISTORY - For undo/redo
// ============================================

export interface ActionHistoryEntry {
  id: string
  timestamp: Date
  agentName: string
  action: AgentAction
  previousState?: any // State before action (for undo)
  status: 'committed' | 'undone' | 'redone'
}

export interface ActionHistory {
  entries: ActionHistoryEntry[]
  currentIndex: number
}

// ============================================
// QUESTION STATE
// ============================================

export type QuestionStatus = 'pending' | 'answered' | 'skipped' | 'timeout'

export interface QuestionState {
  question: AgentQuestion
  status: QuestionStatus
  answer?: string | string[]
  answeredAt?: Date
}

// ============================================
// JSON Schema for LLM structured output
// ============================================

export const AGENT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    message: { type: 'string', description: 'Your response to the user' },
    thinking: { type: 'string', description: 'Your reasoning process (optional)' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: [
              'CREATE_BEAT',
              'UPDATE_BEAT',
              'DELETE_BEAT',
              'REORDER_BEATS',
              'LOCK_BEAT_BOARD',
              'CREATE_CHARACTER',
              'UPDATE_CHARACTER',
              'UPDATE_CHARACTER_METRICS',
              'UPDATE_STRESS_LEVEL',
              'ADD_KNOWLEDGE',
              'UPDATE_SCRIPT',
              'INSERT_SCRIPT_SECTION',
              'REVISE_SCRIPT_SECTION',
              'UPDATE_SERIES_BIBLE',
              'ADD_WORLD_RULE',
              'ADD_SETUP',
              'RESOLVE_SETUP',
              // Partial Bible Update Actions
              'UPDATE_WORLD_RULES',
              'UPDATE_FACTIONS',
              'UPDATE_INSPIRATIONS',
              'UPDATE_WORLD_DESCRIPTION',
              'UPDATE_MOOD_SOUNDTRACK',
              'UPDATE_PLOT_TWISTS',
              'UPDATE_KEY_CHARACTERS',
              'UPDATE_EPISODE_ROADMAP',
              'UPDATE_EPISODE_PREMISE',
            ],
          },
          payload: { type: 'object' },
        },
        required: ['type', 'payload'],
      },
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          agentName: { type: 'string' },
          question: { type: 'string' },
          questionType: {
            type: 'string',
            enum: ['single_choice', 'multiple_choice', 'free_text', 'confirmation'],
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                description: { type: 'string' },
                consequence: { type: 'string' },
                recommended: { type: 'boolean' },
              },
              required: ['id', 'label'],
            },
          },
          context: { type: 'string' },
          urgency: { type: 'string', enum: ['blocking', 'important', 'optional'] },
          defaultOption: { type: 'string' },
        },
        required: ['id', 'question', 'questionType', 'urgency'],
      },
    },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    nextAgent: { type: 'string' },
  },
  required: ['message', 'actions', 'confidence'],
}
