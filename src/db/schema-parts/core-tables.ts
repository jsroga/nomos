import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  real,
  unique,
  vector,
} from 'drizzle-orm/pg-core'

// Projects table (world-building + storyteller)
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  projectPrompt: text('project_prompt'), // legacy field
  masterPrompt: text('master_prompt'), // storyteller field
  userId: uuid('user_id').notNull(),
  seriesBible: jsonb('series_bible').notNull().default({}),
  storyPlan: jsonb('story_plan'),
  styleReferenceUrls: jsonb('style_reference_urls').default([]),
  stylePreset: text('style_preset'),
  generationMode: text('generation_mode'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Storyteller tables
export const characters = pgTable('characters', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  gender: text('gender'),
  description: text('description'),
  portraitUrl: text('portrait_url'),
  characterPrompt: text('character_prompt'),
  mbti: text('mbti'),
  valence: integer('valence').default(0),
  arousal: integer('arousal').default(50),
  autonomy: integer('autonomy').default(60),
  competence: integer('competence').default(60),
  relatedness: integer('relatedness').default(50),
  cognitiveClarity: integer('cognitive_clarity').default(70),
  perceivedStakes: integer('perceived_stakes').default(40),
  socialSafety: integer('social_safety').default(60),
  moralAlignment: integer('moral_alignment').default(70),
  transformationProgress: integer('transformation_progress').default(0),
  voiceSignature: text('voice_signature'),
  psychology: jsonb('psychology').notNull().default({}),
  arcStatus: jsonb('arc_status').notNull().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const episodes = pgTable('episodes', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  sequence: integer('sequence').notNull(),
  title: text('title'),
  masterPrompt: text('master_prompt'),
  summary: text('summary'),
  premise: text('premise'),
  thematicFocus: text('thematic_focus'),
  scriptContent: text('script_content'),
  storyPlan: jsonb('story_plan'),
  planApproved: boolean('plan_approved').default(false),
  currentPhase: text('current_phase').default('premise'),
  status: text('status').default('planning'),
  tenPointsPlan: jsonb('ten_points_plan').default([]),
  posterUrl: text('poster_url'),
  posterPrompt: text('poster_prompt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const beats = pgTable('beats', {
  id: uuid('id').defaultRandom().primaryKey(),
  episodeId: uuid('episode_id')
    .references(() => episodes.id)
    .notNull(),
  sequence: integer('sequence').notNull(),
  logline: text('logline').notNull(),
  beatType: text('beat_type').notNull(),
  content: text('content'),
  visualHook: text('visual_hook'),
  charactersInvolved: jsonb('characters_involved').default([]),
  emotionalShifts: jsonb('emotional_shifts').default({}),
  causalDependencies: jsonb('causal_dependencies').default([]),
  setupsPayoffs: jsonb('setups_payoffs').default({}),
  status: text('status').default('proposed'),
  imageUrl: text('image_url'),
  imagePrompt: text('image_prompt'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

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

export const documentEmbeddings = pgTable('document_embeddings', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata').notNull(),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const entityReferences = pgTable('entity_references', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  metadata: jsonb('metadata').default({}),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  sourceEntityId: uuid('source_entity_id'),
  embedding: vector('embedding', { dimensions: 1536 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastReferencedAt: timestamp('last_referenced_at').defaultNow(),
})

export const relationshipSnapshots = pgTable('relationship_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull(),
  episodeId: uuid('episode_id'),
  beatId: uuid('beat_id'),
  sourceCharacterId: text('source_character_id').notNull(),
  targetCharacterId: text('target_character_id').notNull(),
  relationshipType: text('relationship_type'),
  dynamicSummary: text('dynamic_summary'),
  tensionPoints: jsonb('tension_points').default([]),
  trust: integer('trust').default(50),
  conflict: integer('conflict').default(0),
  tension: integer('tension').default(0),
  powerBalance: integer('power_balance').default(50),
  changeReason: text('change_reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const relationshipEdges = pgTable(
  'relationship_edges',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    sourceId: text('source_id').notNull(),
    targetId: text('target_id').notNull(),
    relationshipType: text('relationship_type').notNull(),
    weight: real('weight').notNull().default(0.5),
    label: text('label'),
    evidence: text('evidence'),
    llmGrounded: boolean('llm_grounded').notNull().default(false),
    confidence: real('confidence'),
    sinceBeatId: uuid('since_beat_id').references(() => beats.id, { onDelete: 'set null' }),
    untilBeatId: uuid('until_beat_id').references(() => beats.id, { onDelete: 'set null' }),
    extractedAt: timestamp('extracted_at').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => [unique().on(table.projectId, table.sourceId, table.targetId, table.relationshipType)]
)

export const seriesBibles = pgTable('series_bibles', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  content: jsonb('content').notNull().default({}),
  isLocked: boolean('is_locked').default(false),
  lockedBy: text('locked_by'),
  lockedAt: timestamp('locked_at'),
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

// Game Entities table (shared across ALL domains - the Swiss Army Knife bridge)
export const gameEntities = pgTable('game_entities', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),

  // Core entity data
  entityType: text('entity_type').notNull(), // 'character' | 'location' | 'mechanic' | 'faction' | 'item' | 'quest'
  name: text('name').notNull(),
  description: text('description'),

  // Domain tracking
  sourceDomain: text('source_domain').notNull(), // 'storyteller' | 'loop-creator' | '3d-canvas' | '2d-canvas'
  sourceEntityId: uuid('source_entity_id'), // ID in the source domain's table
  usedInDomains: text('used_in_domains').array().default([]), // ['storyteller', 'loop-creator']

  // Rich metadata from source domain
  metadata: jsonb('metadata').default({}), // Domain-specific data (character stats, location coordinates, etc.)

  // Search and display
  tags: text('tags').array().default([]),
  imageUrl: text('image_url'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Entity Relationships table (for cross-domain connections)
export const entityRelationships = pgTable('entity_relationships', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),

  fromEntityId: uuid('from_entity_id')
    .notNull()
    .references(() => gameEntities.id, { onDelete: 'cascade' }),
  toEntityId: uuid('to_entity_id')
    .notNull()
    .references(() => gameEntities.id, { onDelete: 'cascade' }),

  relationshipType: text('relationship_type').notNull(), // 'uses' | 'located_in' | 'conflicts_with' | 'allies_with' | 'owns'
  metadata: jsonb('metadata').default({}), // Additional relationship context

  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Tiles table (world-building)
export const tiles = pgTable(
  'tiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    tilePrompt: text('tile_prompt'),
    imageFilename: text('image_filename'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  table => ({
    uniqueTilePosition: unique().on(table.projectId, table.x, table.y),
  })
)

// Assets table (3d-asset-exporter)
export const assets = pgTable('assets', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  imageFilename: text('image_filename').notNull(),
  modelFilename: text('model_filename'),
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Select points table (for SAM segmentation)
export const selectPoints = pgTable('select_points', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  x: integer('x').notNull(),
  y: integer('y').notNull(),
  label: integer('label').default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Interior Designs table (3d-canvas)
export const interiorDesigns = pgTable('interior_designs', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  sceneData: jsonb('scene_data').notNull(), // { walls, floors, objects, activeLevel }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Game Loops table (loop-creator)
export const gameLoops = pgTable('game_loops', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id')
    .notNull()
    .references(() => projects.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  nodes: jsonb('nodes').notNull().default([]),
  edges: jsonb('edges').notNull().default([]),
  metadata: jsonb('metadata'), // { id, name, description, version, genre, etc. }
  analysis: jsonb('analysis'), // { coreInsight, pillarScores, keyInnovations, etc. }
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Admin-configurable per-role model routing (OpenRouter ids). One row per slot;
// writes gated by the admin API (isAdminUser). See shared/agent-kernel/model-settings.
export const modelSettings = pgTable('model_settings', {
  role: text('role').primaryKey(),
  model: text('model').notNull(),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const moduleSettings = pgTable('module_settings', {
  moduleKey: text('module_key').primaryKey(),
  enabled: boolean('enabled').default(true).notNull(),
  canvasSlot: text('canvas_slot'),
  config: jsonb('config').notNull().default({}),
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
