import { db } from '@/db/client'
import { characters, entityReferences, projects } from '@/db'
import { eq, sql } from 'drizzle-orm'
import {
  firstNonEmptyRecord,
  namedRecordsFromJson,
  recordFromJson,
  recordArrayFromJson,
} from '@/shared/data/json-guards'

export interface DbEntityRow {
  id: string
  name: string
  type: string
  description: string | null
  metadata: unknown
  hasEmbedding: boolean
}

export interface ProjectGraphContext {
  projectId: string
  dbCharacters: typeof characters.$inferSelect[]
  dbEntities: DbEntityRow[]
  factions: Record<string, unknown>[]
  keyCharacters: Array<Record<string, unknown> & { name: string }>
  projectCast: Array<Record<string, unknown> & { name: string }>
  storyPlan: Record<string, unknown>
}

export async function fetchProjectGraphContext(
  projectId: string
): Promise<ProjectGraphContext | null> {
  const [project, dbCharacters, dbEntities] = await Promise.all([
    db.query.projects.findFirst({
      where: eq(projects.id, projectId),
      with: { storyPlanTable: true },
    }),
    db.select().from(characters).where(eq(characters.projectId, projectId)),
    db
      .select({
        id: entityReferences.id,
        name: entityReferences.name,
        type: entityReferences.type,
        description: entityReferences.description,
        metadata: entityReferences.metadata,
        hasEmbedding: sql<boolean>`${entityReferences.embedding} IS NOT NULL`,
      })
      .from(entityReferences)
      .where(eq(entityReferences.projectId, projectId)),
  ])

  if (!project) return null

  const storyPlan = firstNonEmptyRecord(project.storyPlanTable?.content, project.storyPlan)
  const seriesBible = recordFromJson(project.seriesBible)
  const factions = recordArrayFromJson(storyPlan.factions)
  const keyCharacters = namedRecordsFromJson(
    storyPlan.keyCharacters ?? storyPlan.cast ?? seriesBible.keyCharacters
  )
  const projectRecord = recordFromJson(project)
  const projectCast = namedRecordsFromJson(projectRecord.cast)

  return {
    projectId,
    dbCharacters,
    dbEntities,
    factions,
    keyCharacters,
    projectCast,
    storyPlan,
  }
}
