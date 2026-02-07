import { BeatCard, CharacterState } from '../types'
import {
  StoryPlan,
  WorldRule,
  Faction,
  SoundtrackTrack,
  InspirationItem,
  KeyCharacter,
  EpisodePremise,
} from '../schemas/agent-schemas'
import { QuestionType, QuestionUrgency, QuestionStatus, ActionStatus, ActionType, MergeMode } from '../enums'

// Re-export ActionType for convenience
export { ActionType, MergeMode }

// ============================================
// AGENT ACTIONS - Operations agents can commit
// ============================================

export type AgentAction = // Beat Operations
  (
    | { type: 'CREATE_BEAT'; payload: Partial<BeatCard> & { logline: string } }
    | { type: 'UPDATE_BEAT'; payload: { beatId: string; updates: Partial<BeatCard> } }
    | { type: 'DELETE_BEAT'; payload: { beatId: string } }
    | { type: 'REORDER_BEATS'; payload: { beatIds: string[] } }
    | { type: 'LOCK_BEAT_BOARD'; payload: { episodeId: string } }

    // Character Operations
    | { type: 'CREATE_CHARACTER'; payload: { name: string; role: string; description?: string } }
    | {
      type: 'UPDATE_CHARACTER'
      payload: { characterId: string; updates: Partial<CharacterState> }
    }
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
      type: 'UPDATE_SERIES_BIBLE' | 'UPDATE_WORLD_BIBLE' | 'UPDATE_BIBLE'
      payload: {
        genre?: string
        tone?: string
        themes?: string[]
        worldRules?: WorldRule[]
        factions?: Faction[]
        keyCharacters?: KeyCharacter[]
        storyPlan?: Partial<StoryPlan>
      }
    }
    | { type: 'ADD_WORLD_RULE'; payload: { rule: string } }
    | { type: 'ADD_SETUP'; payload: { description: string; beatId: string } }
    | { type: 'RESOLVE_SETUP'; payload: { setupId: string; payoffBeatId: string } }

    // Partial Bible Update Operations (Smart Merge)
    | {
      type: 'UPDATE_WORLD_RULES'
      payload: {
        rules: WorldRule[]
        mergeMode: 'replace' | 'merge' | 'smart'
      }
    }
    | {
      type: 'UPDATE_FACTIONS'
      payload: {
        factions: Faction[]
        mergeMode: 'replace' | 'merge' | 'smart'
      }
    }
    | {
      type: 'UPDATE_INSPIRATIONS'
      payload: {
        inspirations: {
          books?: Array<string | InspirationItem>
          movies?: Array<string | InspirationItem>
          games?: Array<string | InspirationItem>
        }
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
      type: 'UPDATE_SOUNDTRACKS'
      payload: {
        soundtracks: SoundtrackTrack[]
        mergeMode?: 'replace' | 'merge'
      }
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
        keyCharacters: KeyCharacter[]
        mergeMode: 'replace' | 'merge' | 'smart'
      }
    }
    | {
      type: 'UPDATE_EPISODE_ROADMAP'
      payload: {
        sequences: Array<{
          id: number
          name: string
          description: string
          keyFactionsInvolved?: string[]
          worldConsequence?: string
        }>
        executiveSummary?: string | null
        mergeMode?: 'replace' | 'merge'
      }
    }
    | {
      type: 'UPDATE_ROADMAP_SUMMARY'
      payload: {
        executiveSummary: string
      }
    }
    | {
      type: 'UPDATE_EPISODE_PREMISE'
      payload: {
        episodeId?: string
        premise: Partial<EpisodePremise>
      }
    }
    | {
      type: 'GENERATE_POSTER'
      payload: {
        episodeId: string
        prompt: string
      }
    }
    | {
      type: 'SET_GENRE_AND_TONE'
      payload: {
        genre: string
        tone: string
        styleReference?: string
      }
    }
    | { type: 'ADD_THEME'; payload: { theme: string } }
    | { type: 'REMOVE_THEME'; payload: { theme: string } }
    | {
      type: 'CREATE_LOCATION'
      payload: {
        name: string
        description: string
        type?: string
        importance?: string
      }
    }
    | {
      type: 'UPDATE_LOCATION'
      payload: {
        locationId: string
        updates: Record<string, any>
      }
    }
    | {
      type: 'ADD_LORE_ENTRY'
      payload: {
        title: string
        content: string
        category?: string
      }
    }
    | {
      type: 'GENERATE_STORY_ROADMAP'
      payload: {
        genre?: string
        tone?: string
        themes?: string[]
        targetAudience?: string
      }
    }
    | { type: 'ADD_BEAT'; payload: { beatId?: string; id?: string;[key: string]: any } }
    | { type: 'ADD_CHARACTER'; payload: { characterId?: string;[key: string]: any } }
    | { type: 'UPDATE_CHARACTER_PSYCHOLOGY'; payload: { characterId: string;[key: string]: any } }
    | { type: 'UPDATE_FACTION'; payload: { factionId: string;[key: string]: any } }
    | { type: 'ADD_FACTION'; payload: { factionId?: string;[key: string]: any } }
    | { type: 'UPDATE_STORY_PLAN'; payload: { [key: string]: any } }
  ) & {
    status?: 'pending' | 'executing' | 'committed' | 'rejected'
    confidence?: number
    reasoning?: string
  }

// ============================================
// AGENT QUESTIONS - Interactive user prompts
// ============================================

// QuestionType is now imported from enums.ts
// QuestionUrgency is now imported from enums.ts
export { QuestionType, QuestionUrgency }

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
  status: ActionStatus
}

export interface ActionHistory {
  entries: ActionHistoryEntry[]
  currentIndex: number
}

// ============================================
// QUESTION STATE
// ============================================

// QuestionStatus is now imported from enums.ts
export { QuestionStatus }

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
            enum: Object.values(ActionType),
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
