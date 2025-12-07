import { pgTable, uuid, text, timestamp, jsonb, integer, unique } from 'drizzle-orm/pg-core'

// Projects table (world-building + storyteller)
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  projectPrompt: text('project_prompt'),
  userId: uuid('user_id').notNull(),
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

// Interior Designs table (interior-designer)
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

// Type exports for use in application
export type Project = typeof projects.$inferSelect
export type NewProject = typeof projects.$inferInsert
export type Tile = typeof tiles.$inferSelect
export type NewTile = typeof tiles.$inferInsert
export type Asset = typeof assets.$inferSelect
export type NewAsset = typeof assets.$inferInsert
export type InteriorDesign = typeof interiorDesigns.$inferSelect
export type NewInteriorDesign = typeof interiorDesigns.$inferInsert
