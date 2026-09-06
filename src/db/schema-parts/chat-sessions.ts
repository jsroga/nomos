import { boolean, index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { projects } from './core-tables'

export const chatSessions = pgTable(
  'chat_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id')
      .references(() => projects.id, { onDelete: 'cascade' })
      .notNull(),
    userId: text('user_id').notNull(),
    moduleId: text('module_id').notNull(),
    thread: text('thread').notNull(),
    resource: text('resource').notNull(),
    title: text('title').notNull(),
    titleLocked: boolean('title_locked').notNull().default(false),
    status: text('status').notNull(),
    runId: text('run_id'),
    wire: text('wire').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  table => ({
    projectUserUpdatedIdx: index('chat_sessions_project_user_updated_idx').on(
      table.projectId,
      table.userId,
      table.updatedAt,
    ),
  }),
)
