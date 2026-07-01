import { eq } from 'drizzle-orm'

import { db } from '@/lib/db'
import { beats, characters, episodes, gameLoops, projects } from '@/db'

export interface AccessResult {
  hasAccess: boolean
  projectId?: string
}

export interface BeatAccessResult extends AccessResult {
  episodeId?: string
}

export async function verifyProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) return false

  if (
    userId === 'e2e-test-user-id' &&
    ['development', 'test'].includes(process.env.NODE_ENV || '')
  ) {
    return true
  }

  return project.userId === userId
}

export async function verifyEpisodeAccess(
  episodeId: string,
  userId: string
): Promise<AccessResult> {
  const result = await db
    .select({
      episodeId: episodes.id,
      projectId: projects.id,
      projectUserId: projects.userId,
    })
    .from(episodes)
    .innerJoin(projects, eq(episodes.projectId, projects.id))
    .where(eq(episodes.id, episodeId))
    .limit(1)

  if (result.length === 0) {
    return { hasAccess: false }
  }

  const row = result[0]
  if (row.projectUserId !== userId) {
    return { hasAccess: false }
  }

  return {
    hasAccess: true,
    projectId: row.projectId,
  }
}

export async function verifyBeatAccess(beatId: string, userId: string): Promise<BeatAccessResult> {
  const result = await db
    .select({
      beatId: beats.id,
      episodeId: episodes.id,
      projectId: projects.id,
      projectUserId: projects.userId,
    })
    .from(beats)
    .innerJoin(episodes, eq(beats.episodeId, episodes.id))
    .innerJoin(projects, eq(episodes.projectId, projects.id))
    .where(eq(beats.id, beatId))
    .limit(1)

  if (result.length === 0) {
    return { hasAccess: false }
  }

  const row = result[0]
  if (row.projectUserId !== userId) {
    return { hasAccess: false }
  }

  return {
    hasAccess: true,
    projectId: row.projectId,
    episodeId: row.episodeId,
  }
}

export async function verifyCharacterAccess(
  characterId: string,
  userId: string
): Promise<AccessResult> {
  const result = await db
    .select({
      characterId: characters.id,
      projectId: projects.id,
      projectUserId: projects.userId,
    })
    .from(characters)
    .innerJoin(projects, eq(characters.projectId, projects.id))
    .where(eq(characters.id, characterId))
    .limit(1)

  if (result.length === 0) {
    return { hasAccess: false }
  }

  const row = result[0]
  if (row.projectUserId !== userId) {
    return { hasAccess: false }
  }

  return {
    hasAccess: true,
    projectId: row.projectId,
  }
}

export async function verifyGameLoopAccess(loopId: string, userId: string): Promise<AccessResult> {
  const result = await db
    .select({
      loopId: gameLoops.id,
      projectId: projects.id,
      projectUserId: projects.userId,
    })
    .from(gameLoops)
    .innerJoin(projects, eq(gameLoops.projectId, projects.id))
    .where(eq(gameLoops.id, loopId))
    .limit(1)

  if (result.length === 0) {
    return { hasAccess: false }
  }

  const row = result[0]
  if (row.projectUserId !== userId) {
    return { hasAccess: false }
  }

  return {
    hasAccess: true,
    projectId: row.projectId,
  }
}
