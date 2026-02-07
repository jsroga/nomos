/**
 * Storyteller Access Verification - Optimized with JOINs
 *
 * Fixes N+1 query patterns by using single JOIN queries
 * instead of multiple sequential queries.
 */

import { db } from '@/lib/db'
import { beats, episodes, projects, characters } from '@/domains/storyteller/db/schema'
import { gameLoops } from '@/db/schema'
import { eq } from 'drizzle-orm'

// ============================================
// TYPES
// ============================================

export interface AccessResult {
  hasAccess: boolean
  projectId?: string
}

export interface BeatAccessResult extends AccessResult {
  episodeId?: string
}

// ============================================
// PROJECT ACCESS
// ============================================

/**
 * Verify user has access to a project
 * Single query - most basic check
 */
export async function verifyProjectAccess(projectId: string, userId: string): Promise<boolean> {
  const result = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (result.length === 0) return false

  // Note: With Drizzle we need to also check userId
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  // Allow E2E test user to bypass access checks in dev/test
  if (userId === 'e2e-test-user-id' && ['development', 'test'].includes(process.env.NODE_ENV || '')) {
    return true
  }

  return project?.userId === userId
}

// ============================================
// EPISODE ACCESS
// ============================================

/**
 * Verify user has access to an episode through project ownership
 * Uses single JOIN query instead of 2 sequential queries
 */
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

// ============================================
// BEAT ACCESS
// ============================================

/**
 * Verify user has access to a beat through episode -> project ownership
 * Uses single JOIN query instead of 3 sequential queries
 */
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

// ============================================
// CHARACTER ACCESS
// ============================================

/**
 * Verify user has access to a character through project ownership
 * Uses single JOIN query instead of 2 sequential queries
 */
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

// ============================================
// GAME LOOP ACCESS
// ============================================

/**
 * Verify user has access to a game loop through project ownership
 * Uses single JOIN query instead of 2 sequential queries
 */
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

// ============================================
// BULK ACCESS (for lists)
// ============================================

/**
 * Get all projects accessible by a user
 * Returns list of project IDs
 */
export async function getUserProjects(userId: string): Promise<string[]> {
  const result = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, userId))

  return result.map(r => r.id)
}

/**
 * Verify multiple entities at once
 * More efficient for batch operations
 */
export async function verifyMultipleBeatAccess(
  beatIds: string[],
  userId: string
): Promise<Map<string, boolean>> {
  if (beatIds.length === 0) return new Map()

  // Get user's project IDs first
  const userProjectIds = await getUserProjects(userId)
  const projectIdSet = new Set(userProjectIds)

  // Query all beats with their project chain
  const results = await db
    .select({
      beatId: beats.id,
      projectId: projects.id,
    })
    .from(beats)
    .innerJoin(episodes, eq(beats.episodeId, episodes.id))
    .innerJoin(projects, eq(episodes.projectId, projects.id))
  // Note: We'd need to use SQL IN clause for beatIds filtering
  // For now, filter in memory for simplicity

  const accessMap = new Map<string, boolean>()
  const resultMap = new Map(results.map(r => [r.beatId, r.projectId]))

  for (const beatId of beatIds) {
    const projectId = resultMap.get(beatId)
    accessMap.set(beatId, projectId ? projectIdSet.has(projectId) : false)
  }

  return accessMap
}
