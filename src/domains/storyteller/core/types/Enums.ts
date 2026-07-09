/**
 * Storyteller Domain Enums
 *
 * Consolidated enum definitions for type-safe string literals throughout the storyteller module.
 */

// ============================================
// Beat Types - The fundamental building blocks of story structure
// ============================================

export enum BeatType {
  SETUP = 'setup',
  COMPLICATION = 'complication',
  REVELATION = 'revelation',
  DECISION = 'decision',
  CONSEQUENCE = 'consequence',
  // Extended types for more granular beat categorization
  CONFLICT_ESCALATION = 'conflict_escalation',
  FACTION_MOVE = 'faction_move',
  WORLD_EVENT = 'world_event',
}

// ============================================
// Beat Status - Track beat approval workflow
// ============================================

export enum BeatStatus {
  PROPOSED = 'proposed',
  CHALLENGED = 'challenged',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  LOCKED = 'locked',
}

// ============================================
// Phase - Writers room workflow phases
// Canonical model: premise -> breaking -> writing -> complete.
// `PhaseId` is the string-literal union used at UI/tool boundaries.
// ============================================

export enum Phase {
  PREMISE = 'premise',
  BREAKING = 'breaking',
  WRITING = 'writing',
  COMPLETE = 'complete',
}

export type PhaseId = `${Phase}`

export function parsePhaseId(value: string | undefined): PhaseId {
  switch (value) {
    case Phase.BREAKING:
    case Phase.WRITING:
    case Phase.COMPLETE:
      return value
    default:
      return Phase.PREMISE
  }
}

// ============================================
// Question machine state - UI flow for questions
// ============================================

export enum QuestionMachineState {
  IDLE = 'idle',
  AWAITING_ANSWER = 'awaiting_answer',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
}

export enum QuestionType {
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  FREE_TEXT = 'free_text',
  CONFIRMATION = 'confirmation',
}

// ============================================
// Question Urgency - Priority levels for questions
// ============================================

export enum QuestionUrgency {
  BLOCKING = 'blocking',
  IMPORTANT = 'important',
  OPTIONAL = 'optional',
}

// ============================================
// Question Status - Question state tracking
// ============================================

export enum QuestionStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
  SKIPPED = 'skipped',
  TIMEOUT = 'timeout',
}

// ============================================
// Action Status - Undo/redo history tracking
// ============================================

export enum ActionHistoryStatus {
  COMMITTED = 'committed',
  UNDONE = 'undone',
  REDONE = 'redone',
}

/** @deprecated Use {@link ActionHistoryStatus} for undo/history; {@link ApprovalActionStatus} for stream approval. */
export const ActionStatus = ActionHistoryStatus

// ============================================
// Bible Section - Sections of the World Bible
// ============================================

export enum BibleSection {
  WORLD_DESCRIPTION = 'worldDescription',
  WORLD_RULES = 'worldRules',
  FACTIONS = 'factions',
  INSPIRATIONS = 'inspirations',
  PLOT_TWISTS = 'plotTwists',
  EPISODE_ROADMAP = 'episodeRoadmap',
  CAST = 'cast', // Project-level cast (replaces keyCharacters)
  SOUNDTRACKS = 'soundtracks',
  MOODBOARD = 'moodboard',
  EPISODE_PREMISE = 'episodePremise',
  ITEMS = 'items',
  EVENTS = 'events',
  FULL = 'full',
}

// ============================================
// Action Type - Agent action types
// ============================================

export enum ActionType {
  // Beat Operations
  CREATE_BEAT = 'CREATE_BEAT',
  UPDATE_BEAT = 'UPDATE_BEAT',
  UPDATE_BEAT_CONTENT = 'UPDATE_BEAT_CONTENT', // legacy wire alias
  DELETE_BEAT = 'DELETE_BEAT',
  REORDER_BEATS = 'REORDER_BEATS',
  REORDER_BEAT = 'REORDER_BEAT', // legacy wire alias
  LOCK_BEAT_BOARD = 'LOCK_BEAT_BOARD',
  ADD_BEAT = 'ADD_BEAT',

  // Character Operations
  CREATE_CHARACTER = 'CREATE_CHARACTER',
  UPDATE_CHARACTER = 'UPDATE_CHARACTER',
  UPDATE_CHARACTER_PROFILE = 'UPDATE_CHARACTER_PROFILE', // legacy wire alias
  UPDATE_CHARACTER_METRICS = 'UPDATE_CHARACTER_METRICS',
  UPDATE_STRESS_LEVEL = 'UPDATE_STRESS_LEVEL',
  ADD_KNOWLEDGE = 'ADD_KNOWLEDGE',
  ADD_CHARACTER = 'ADD_CHARACTER',
  UPDATE_CHARACTER_PSYCHOLOGY = 'UPDATE_CHARACTER_PSYCHOLOGY',

  // Script Operations
  UPDATE_SCRIPT = 'UPDATE_SCRIPT',
  UPDATE_SCRIPT_CONTENT = 'UPDATE_SCRIPT_CONTENT', // legacy wire alias
  INSERT_SCRIPT_SECTION = 'INSERT_SCRIPT_SECTION',
  REVISE_SCRIPT_SECTION = 'REVISE_SCRIPT_SECTION',

  // Story Bible Operations (Full)
  UPDATE_SERIES_BIBLE = 'UPDATE_SERIES_BIBLE',
  UPDATE_WORLD_BIBLE = 'UPDATE_WORLD_BIBLE',
  UPDATE_BIBLE = 'UPDATE_BIBLE',
  ADD_WORLD_RULE = 'ADD_WORLD_RULE',
  ADD_SETUP = 'ADD_SETUP',
  RESOLVE_SETUP = 'RESOLVE_SETUP',

  // Partial Bible Updates
  UPDATE_WORLD_RULES = 'UPDATE_WORLD_RULES',
  UPDATE_FACTIONS = 'UPDATE_FACTIONS',
  UPDATE_INSPIRATIONS = 'UPDATE_INSPIRATIONS',
  UPDATE_WORLD_DESCRIPTION = 'UPDATE_WORLD_DESCRIPTION',
  UPDATE_MOOD_SOUNDTRACK = 'UPDATE_MOOD_SOUNDTRACK',
  UPDATE_SOUNDTRACKS = 'UPDATE_SOUNDTRACKS',
  UPDATE_MOODBOARD = 'UPDATE_MOODBOARD',
  UPDATE_PLOT_TWISTS = 'UPDATE_PLOT_TWISTS',
  UPDATE_CAST = 'UPDATE_CAST', // Project-level cast (replaces UPDATE_KEY_CHARACTERS)
  UPDATE_KEY_CHARACTERS = 'UPDATE_KEY_CHARACTERS', // legacy wire alias
  UPDATE_EPISODE_ROADMAP = 'UPDATE_EPISODE_ROADMAP',
  UPDATE_ROADMAP_SUMMARY = 'UPDATE_ROADMAP_SUMMARY',
  UPDATE_EPISODE_PREMISE = 'UPDATE_EPISODE_PREMISE',
  UPDATE_ITEMS = 'UPDATE_ITEMS',
  UPDATE_EVENTS = 'UPDATE_EVENTS',
  UPDATE_STORY_PHASE = 'UPDATE_STORY_PHASE',

  // Story Plan
  UPDATE_STORY_PLAN = 'UPDATE_STORY_PLAN',

  // Faction Operations
  UPDATE_FACTION = 'UPDATE_FACTION',
  ADD_FACTION = 'ADD_FACTION',

  // Location Operations
  CREATE_LOCATION = 'CREATE_LOCATION',
  UPDATE_LOCATION = 'UPDATE_LOCATION',
  ADD_LORE_ENTRY = 'ADD_LORE_ENTRY',

  // Generation Operations
  GENERATE_POSTER = 'GENERATE_POSTER',
  GENERATE_STORY_ROADMAP = 'GENERATE_STORY_ROADMAP',
  SET_GENRE_AND_TONE = 'SET_GENRE_AND_TONE',
  ADD_THEME = 'ADD_THEME',
  REMOVE_THEME = 'REMOVE_THEME',
}

