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
// ============================================

export enum Phase {
  PREMISE = 'premise',
  BREAKING = 'breaking',
  CARDLOCK = 'cardlock',
  WRITING = 'writing',
  COMPLETE = 'complete',
}

// ============================================
// Plan Status - Task/plan item states
// ============================================

export enum PlanStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

// ============================================
// Question Types - Interactive question types
// ============================================

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

export enum ActionStatus {
  COMMITTED = 'committed',
  UNDONE = 'undone',
  REDONE = 'redone',
}

// ============================================
// Merge Mode - Bible update merge strategies
// ============================================

export enum MergeMode {
  REPLACE = 'replace',
  MERGE = 'merge',
  SMART = 'smart',
}

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
  FULL = 'full',
}

// ============================================
// Action Type - Agent action types
// ============================================

export enum ActionType {
  // Beat Operations
  CREATE_BEAT = 'CREATE_BEAT',
  UPDATE_BEAT = 'UPDATE_BEAT',
  DELETE_BEAT = 'DELETE_BEAT',
  REORDER_BEATS = 'REORDER_BEATS',
  LOCK_BEAT_BOARD = 'LOCK_BEAT_BOARD',
  ADD_BEAT = 'ADD_BEAT',

  // Character Operations
  CREATE_CHARACTER = 'CREATE_CHARACTER',
  UPDATE_CHARACTER = 'UPDATE_CHARACTER',
  UPDATE_CHARACTER_METRICS = 'UPDATE_CHARACTER_METRICS',
  UPDATE_STRESS_LEVEL = 'UPDATE_STRESS_LEVEL',
  ADD_KNOWLEDGE = 'ADD_KNOWLEDGE',
  ADD_CHARACTER = 'ADD_CHARACTER',
  UPDATE_CHARACTER_PSYCHOLOGY = 'UPDATE_CHARACTER_PSYCHOLOGY',

  // Script Operations
  UPDATE_SCRIPT = 'UPDATE_SCRIPT',
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
  UPDATE_EPISODE_ROADMAP = 'UPDATE_EPISODE_ROADMAP',
  UPDATE_ROADMAP_SUMMARY = 'UPDATE_ROADMAP_SUMMARY',
  UPDATE_EPISODE_PREMISE = 'UPDATE_EPISODE_PREMISE',
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

// ============================================
// Episode Premise Section - Parts of episode premise
// ============================================

export enum EpisodePremiseSection {
  PROTAGONIST_HOOK = 'protagonistHook',
  FATAL_FLAW = 'fatalFlaw',
  STAKES = 'stakes',
  INEVITABLE_CONSEQUENCE = 'inevitableConsequence',
  THE_HOOK = 'theHook',
  THE_TURN = 'theTurn',
  THE_AFTERMATH = 'theAftermath',
  TRANSFORMATION = 'transformation',
  THEMATIC_FOCUS = 'thematicFocus',
  LOGLINE = 'logline',
  TITLE = 'title',
}

// ============================================
// World Rule Category - Categories for world rules
// ============================================

export enum WorldRuleCategory {
  MAGIC = 'Magic',
  PHYSICS = 'Physics',
  TECHNOLOGY = 'Technology',
  SOCIETY = 'Society',
  POLITICS = 'Politics',
  ECONOMICS = 'Economics',
}

// ============================================
// Character Role - Character roles in story
// ============================================

export enum CharacterRole {
  PROTAGONIST = 'Protagonist',
  ANTAGONIST = 'Antagonist',
  SUPPORTING = 'Supporting',
  MENTOR = 'Mentor',
  SIDEKICK = 'Sidekick',
}

// ============================================
// Verdict Types - Agent verdicts
// ============================================

export enum Verdict {
  PASS = 'PASS',
  CHALLENGE = 'CHALLENGE',
  REVISE = 'REVISE',
}

// ============================================
// Agent Roles - Named agents in the system
// ============================================

export enum AgentRole {
  SUPERVISOR = 'supervisor',
  PLANNER = 'planner',
  PREMISE_ARCHITECT = 'premise_architect',
  PLOT_ARCHITECT = 'plot_architect',
  WRITER = 'writer',
  SCRIPT_EDITOR = 'script_editor',
  DEVILS_ADVOCATE = 'devils_advocate',
  CHARACTER_PSYCHOLOGY = 'character_psychology',
  CONSEQUENCE_TRACKER = 'consequence_tracker',
  WORLD_SIMULATOR = 'world_simulator',
  VISUAL_MOMENT = 'visual_moment',
  MAGIC_AGENT = 'magic_agent',
}
