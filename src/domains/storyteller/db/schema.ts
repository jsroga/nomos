import {
  pgTable,
  text,
  timestamp,
  uuid,
  jsonb,
  boolean,
  integer,
  vector,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Projects Table - The container for a story
export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(), // Owner of the project
  name: text('name').notNull(),
  description: text('description'),
  masterPrompt: text('master_prompt'), // Global style/instruction
  seriesBible: jsonb('series_bible').notNull().default({}), // Stores the immutable truths
  storyPlan: jsonb('story_plan'), // Series-level story plan (applies to all episodes)
  styleReferenceUrls: jsonb('style_reference_urls').default([]), // Midjourney --sref URLs
  stylePreset: text('style_preset'), // Predefined style preset key (overrides styleReferenceUrls)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Characters Table
export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(), // Protagonist, Antagonist, etc.
  gender: text('gender'),
  description: text('description'), // Physical/Personality description
  portraitUrl: text('portrait_url'), // URL to character portrait
  characterPrompt: text('character_prompt'), // Specific instructions for this character
  mbti: text('mbti'), // e.g. INTJ

  // Psychologically-grounded metrics (based on Affective Circumplex + Self-Determination Theory)
  // Core Affective State
  valence: integer('valence').default(0), // -100 to +100 - Emotional tone (negative to positive)
  arousal: integer('arousal').default(50), // 0-100 - Energy/activation level

  // Psychological Needs (Self-Determination Theory)
  autonomy: integer('autonomy').default(60), // 0-100 - Perceived freedom and self-direction
  competence: integer('competence').default(60), // 0-100 - Belief in capability
  relatedness: integer('relatedness').default(50), // 0-100 - Sense of connection to others

  // Cognitive & Threat Assessment
  cognitiveClarity: integer('cognitive_clarity').default(70), // 0-100 - Mental sharpness
  perceivedStakes: integer('perceived_stakes').default(40), // 0-100 - How much is on the line

  // Social & Moral Mechanisms
  socialSafety: integer('social_safety').default(60), // 0-100 - Perceived safety in social context
  moralAlignment: integer('moral_alignment').default(70), // 0-100 - Alignment between actions and values

  transformationProgress: integer('transformation_progress').default(0), // 0-100 - Arc progress
  voiceSignature: text('voice_signature'), // Description of how they speak
  psychology: jsonb('psychology').notNull().default({}), // Goals, fears, delusions
  arcStatus: jsonb('arc_status').notNull().default({}), // Current transformation state
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Episodes/Chapters Table
export const episodes = pgTable('episodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  sequence: integer('sequence').notNull(),
  title: text('title'),
  masterPrompt: text('master_prompt'), // Episode-specific style override
  summary: text('summary'), // Compressed context
  premise: text('premise'), // The "Ozymandias" style premise
  thematicFocus: text('thematic_focus'), // The central theme of this episode
  scriptContent: text('script_content'), // The actual prose
  storyPlan: jsonb('story_plan'), // 8-sequence structure
  planApproved: boolean('plan_approved').default(false), // Whether the plan has been approved
  currentPhase: text('current_phase').default('premise'), // premise, breaking, cardlock, writing, complete
  status: text('status').default('planning'), // planning, breaking, writing, completed
  tenPointsPlan: jsonb('ten_points_plan').default([]), // The 10-point plan for the episode
  posterUrl: text('poster_url'), // Generated episode poster/cover URL
  posterPrompt: text('poster_prompt'), // The prompt used to generate the poster
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Beats Table - The core unit (Index Card)
export const beats = pgTable('beats', {
  id: uuid('id').defaultRandom().primaryKey(),
  episodeId: uuid('episode_id')
    .references(() => episodes.id)
    .notNull(),
  sequence: integer('sequence').notNull(),
  logline: text('logline').notNull(),
  beatType: text('beat_type').notNull(), // setup, complication, revelation, decision, consequence
  content: text('content'), // Detailed description
  visualHook: text('visual_hook'), // "What's the first thing we see?"
  charactersInvolved: jsonb('characters_involved').default([]),
  emotionalShifts: jsonb('emotional_shifts').default({}), // { "charId": { from: "A", to: "B" } }
  causalDependencies: jsonb('causal_dependencies').default([]), // Array of beat IDs
  setupsPayoffs: jsonb('setups_payoffs').default({}), // { setupId?: string; payoffFor?: string }
  status: text('status').default('proposed'), // proposed, challenged, approved, locked
  imageUrl: text('image_url'), // Generated storyboard image URL
  imagePrompt: text('image_prompt'), // The prompt used to generate the image
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Setups/Payoffs Table - Tracking causality
export const setups = pgTable('setups', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  setupBeatId: uuid('setup_beat_id').references(() => beats.id),
  payoffBeatId: uuid('payoff_beat_id').references(() => beats.id),
  description: text('description').notNull(),
  isResolved: boolean('is_resolved').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// RAG Embeddings Table
export const documentEmbeddings = pgTable('document_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').notNull(), // { type: 'script'|'beat', sourceId: '...' }
  embedding: vector('embedding', { dimensions: 1536 }), // OpenAI ada-002 dimensions
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Entity References Table - For smart entity linking system
// Stores all referenceable entities with embeddings for GraphRAG
export const entityReferences = pgTable('entity_references', {
  id: text('id').primaryKey(), // e.g., "char-a1b2c3d4", "place-e5f6g7h8"
  type: text('type').notNull(), // character, place, event, faction, rule, beat
  name: text('name').notNull(), // Display name
  description: text('description'), // For tooltip display
  metadata: jsonb('metadata').default({}), // Full entity data for context injection
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  sourceEntityId: uuid('source_entity_id'), // Link to original table (characters.id, beats.id, etc.)
  embedding: vector('embedding', { dimensions: 1536 }), // For GraphRAG similarity search
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastReferencedAt: timestamp('last_referenced_at').defaultNow(),
})

// Relationship Snapshots Table - Tracks relationship evolution per beat (R2)
export const relationshipSnapshots = pgTable('relationship_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  episodeId: uuid('episode_id'),
  beatId: uuid('beat_id'), // Which beat caused this snapshot
  sourceCharacterId: text('source_character_id').notNull(), // Character ID or name
  targetCharacterId: text('target_character_id').notNull(), // Character ID or name
  relationshipType: text('relationship_type').notNull(), // ally, enemy, rival, mentor, etc.
  trust: integer('trust').default(50), // 0-100
  conflict: integer('conflict').default(0), // 0-100
  tension: integer('tension').default(0), // 0-100
  powerBalance: integer('power_balance').default(50), // 0-100 (who holds power: 0=target, 100=source)
  changeReason: text('change_reason'), // Why this changed
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Relations for Drizzle Queries
// New tables for migration
export const seriesBibles = pgTable('series_bibles', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  content: jsonb('content').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const storyPlans = pgTable('story_plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  content: jsonb('content').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Relations for Drizzle Queries
export const projectsRelations = relations(projects, ({ one, many }) => ({
  characters: many(characters),
  episodes: many(episodes),
  embeddings: many(documentEmbeddings),
  seriesBibleTable: one(seriesBibles, {
    fields: [projects.id],
    references: [seriesBibles.projectId],
  }),
  storyPlanTable: one(storyPlans, {
    fields: [projects.id],
    references: [storyPlans.projectId],
  }),
}))

export const episodesRelations = relations(episodes, ({ one, many }) => ({
  project: one(projects, {
    fields: [episodes.projectId],
    references: [projects.id],
  }),
  beats: many(beats),
}))

export const beatsRelations = relations(beats, ({ one }) => ({
  episode: one(episodes, {
    fields: [beats.episodeId],
    references: [episodes.id],
  }),
}))

export const seriesBiblesRelations = relations(seriesBibles, ({ one }) => ({
  project: one(projects, {
    fields: [seriesBibles.projectId],
    references: [projects.id],
  }),
}))

export const storyPlansRelations = relations(storyPlans, ({ one }) => ({
  project: one(projects, {
    fields: [storyPlans.projectId],
    references: [projects.id],
  }),
}))
