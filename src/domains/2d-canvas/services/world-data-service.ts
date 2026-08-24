import 'server-only'

import { and, desc, eq } from 'drizzle-orm'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { db } from '@/db'
import { assets, projects, tiles } from '@/db/schema'
import { recordFromJson } from '@/shared/data/json-guards'
import type {
  CreateProjectRequest,
  DeleteTileRequest,
  UpsertTileRequest,
  WorldAsset,
  WorldProject,
  WorldTile,
} from '../core/io/world.dto'

function mapProject(row: typeof projects.$inferSelect): WorldProject {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    masterPrompt: row.masterPrompt ?? '',
    description: row.description ?? null,
    seriesBible: recordFromJson(row.seriesBible),
    storyPlan: recordFromJson(row.storyPlan),
    stylePreset: row.stylePreset ?? null,
    generationMode: row.generationMode ?? null,
    canvasMasterPrompt: row.canvasMasterPrompt ?? '',
    styleAnchorUrl: row.styleAnchorUrl ?? null,
    createdAt: row.createdAt?.toISOString(),
  }
}

function mapTile(row: typeof tiles.$inferSelect): WorldTile {
  return {
    id: row.id,
    projectId: row.projectId,
    x: row.x,
    y: row.y,
    tilePrompt: row.tilePrompt ?? null,
    imageFilename: row.imageFilename ?? null,
    createdAt: row.createdAt?.toISOString(),
  }
}

function mapAsset(row: typeof assets.$inferSelect): WorldAsset {
  return {
    id: row.id,
    projectId: row.projectId,
    userId: row.userId,
    imageFilename: row.imageFilename,
    modelFilename: row.modelFilename ?? null,
    metadata: recordFromJson(row.metadata),
    createdAt: row.createdAt?.toISOString(),
  }
}

export class WorldProjectService {
  async listForUser(userId: string): Promise<WorldProject[]> {
    const rows = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, userId))
      .orderBy(desc(projects.createdAt))
    return rows.map(mapProject)
  }

  async create(userId: string, input: CreateProjectRequest): Promise<WorldProject> {
    const [row] = await db
      .insert(projects)
      .values({
        userId,
        name: input.name,
        masterPrompt: input.masterPrompt,
        seriesBible: {},
      })
      .returning()
    return mapProject(row)
  }

  async deleteForUser(userId: string, projectId: string): Promise<void> {
    await db
      .delete(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
  }
}

export class WorldTileService {
  /**
   * Takes a verified scope, not a bare id: this reads through Drizzle, which
   * connects as a BYPASSRLS role, so the database will return another tenant's
   * tiles for the asking. The caller cannot construct a ProjectScope without
   * having passed the ownership check.
   */
  async listForProject(scope: ProjectScope): Promise<WorldTile[]> {
    const rows = await db.select().from(tiles).where(eq(tiles.projectId, scope.projectId))
    return rows.map(mapTile)
  }

  async upsert(input: UpsertTileRequest): Promise<WorldTile> {
    const [row] = await db
      .insert(tiles)
      .values({
        projectId: input.projectId,
        x: input.x,
        y: input.y,
        tilePrompt: input.tilePrompt,
        imageFilename: input.imageFilename,
      })
      .onConflictDoUpdate({
        target: [tiles.projectId, tiles.x, tiles.y],
        set: {
          tilePrompt: input.tilePrompt,
          imageFilename: input.imageFilename,
        },
      })
      .returning()
    return mapTile(row)
  }

  async remove(input: DeleteTileRequest): Promise<void> {
    await db
      .delete(tiles)
      .where(
        and(
          eq(tiles.projectId, input.projectId),
          eq(tiles.x, input.x),
          eq(tiles.y, input.y)
        )
      )
  }
}

export class WorldAssetService {
  /** See the tile service: Drizzle bypasses RLS, so the scope is the proof. */
  async listForProject(scope: ProjectScope): Promise<WorldAsset[]> {
    const rows = await db
      .select()
      .from(assets)
      .where(eq(assets.projectId, scope.projectId))
      .orderBy(desc(assets.createdAt))
    return rows.map(mapAsset)
  }
}

export const worldProjectService = new WorldProjectService()
export const worldTileService = new WorldTileService()
export const worldAssetService = new WorldAssetService()
