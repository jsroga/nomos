/**
 * Storyteller Access Verification - Optimized with JOINs
 *
 * Fixes N+1 query patterns by using single JOIN queries
 * instead of multiple sequential queries.
 */

import { db } from '@/db/client'
import { beats, episodes, projects, characters, gameLoops } from '@/db/schema'
import { eq } from 'drizzle-orm'

import { ProjectForbidden, projectScope, type ProjectScope } from '@/shared/auth/project-scope'

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


// ============================================
// DERIVED SCOPES
// ============================================

/**
 * Episode/beat/character scopes extend ProjectScope, so anything accepting a
 * project scope accepts these — and the JOIN that resolves the owning project
 * is not repeated. Each throws ProjectForbidden, which routes map to 404.
 */
export interface EpisodeScope extends ProjectScope {
  readonly episodeId: string
}

export interface BeatScope extends EpisodeScope {
  readonly beatId: string
}

export interface CharacterScope extends ProjectScope {
  readonly characterId: string
}

export async function episodeScope(episodeId: string, userId: string): Promise<EpisodeScope> {
  const access = await verifyEpisodeAccess(episodeId, userId)
  if (!access.hasAccess || !access.projectId) throw new ProjectForbidden()
  const scope = await projectScope(access.projectId, userId)
  return { ...scope, episodeId }
}

export async function beatScope(beatId: string, userId: string): Promise<BeatScope> {
  const access = await verifyBeatAccess(beatId, userId)
  if (!access.hasAccess || !access.projectId || !access.episodeId) throw new ProjectForbidden()
  const scope = await projectScope(access.projectId, userId)
  return { ...scope, episodeId: access.episodeId, beatId }
}

export async function characterScope(
  characterId: string,
  userId: string
): Promise<CharacterScope> {
  const access = await verifyCharacterAccess(characterId, userId)
  if (!access.hasAccess || !access.projectId) throw new ProjectForbidden()
  const scope = await projectScope(access.projectId, userId)
  return { ...scope, characterId }
}
