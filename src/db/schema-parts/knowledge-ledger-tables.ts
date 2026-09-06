import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { episodes, projects, beats } from './core-tables'

export const knowledgeLedger = pgTable('knowledge_ledger', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  episodeId: uuid('episode_id').references(() => episodes.id),
  beatId: uuid('beat_id').references(() => beats.id),
  factText: text('fact_text').notNull(),
  authorTruth: boolean('author_truth').notNull().default(false),
  knownBy: jsonb('known_by').notNull().default([]),
  version: integer('version').notNull().default(1),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const promotedProjectRules = pgTable('promoted_project_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id')
    .references(() => projects.id)
    .notNull(),
  ruleName: text('rule_name').notNull(),
  ruleText: text('rule_text').notNull(),
  consequence: text('consequence').notNull(),
  version: integer('version').notNull().default(1),
  revokedAt: timestamp('revoked_at'),
  promotedFrom: text('promoted_from'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
