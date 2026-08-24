/**
 * Storyteller Access Verification - Optimized with JOINs
 *
 * Fixes N+1 query patterns by using single JOIN queries
 * instead of multiple sequential queries.
 */

import { db } from '@/db/client'
import { beats, episodes, projects, characters, gameLoops } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Project ownership is platform-level: shared/jobs and shared/http need it too,
// and shared/ may not import @/domains/*. Re-exported here so the ~69 existing
// call sites keep their import path.
export { verifyProjectAccess } from '@/shared/auth/project-access'

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

