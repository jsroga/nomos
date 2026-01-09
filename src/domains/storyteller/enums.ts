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
