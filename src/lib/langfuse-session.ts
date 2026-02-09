/**
 * Langfuse Session Management
 *
 * Sessions in Langfuse group multiple traces together for:
 * - Multi-turn conversations
 * - User journeys across features
 * - Project/episode-scoped interactions
 *
 * @see https://langfuse.com/docs/observability/features/sessions
 */

import { v4 as uuidv4 } from 'uuid'

/**
 * Generate a consistent session ID for a project+episode combination
 * This ensures all interactions within the same context are grouped together
 */
export function generateSessionId(projectId?: string, episodeId?: string, userId?: string): string {
  if (projectId && episodeId) {
    // Episode-specific session: groups all chat within one episode
    return `session-${projectId}-${episodeId}`
  }

  if (projectId) {
    // Project-level session: groups all chat within one project
    return `session-${projectId}`
  }

  if (userId) {
    // User-level session with timestamp for new sessions
    return `session-user-${userId}-${Date.now()}`
  }

  // Fallback: unique session ID
  return `session-${uuidv4()}`
}

/**
 * Generate a user-specific session ID for tracking user journeys
 * Useful for tracking a user's complete interaction flow
 */
function generateUserSessionId(userId: string, domain: string = 'general'): string {
  return `session-${domain}-${userId}`
}

/**
 * Get or create a browser session ID (persisted in sessionStorage)
 * Useful for tracking sessions across page refreshes
 */
function getBrowserSessionId(key: string = 'langfuse-session'): string {
  if (typeof window === 'undefined') {
    return `session-ssr-${uuidv4()}`
  }

  let sessionId = sessionStorage.getItem(key)
  if (!sessionId) {
    sessionId = `session-browser-${uuidv4()}`
    sessionStorage.setItem(key, sessionId)
  }

  return sessionId
}

/**
 * Clear browser session (useful for "new conversation" functionality)
 */
function clearBrowserSession(key: string = 'langfuse-session'): void {
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(key)
  }
}

/**
 * Session metadata type for Langfuse
 */
export interface LangfuseSessionMetadata {
  sessionId: string
  userId?: string
  projectId?: string
  episodeId?: string
  domain?: string
  startedAt?: string
}

/**
 * Create session metadata object for API calls
 */
function createSessionMetadata(
  projectId?: string,
  episodeId?: string,
  userId?: string,
  domain: string = 'storyteller'
): LangfuseSessionMetadata {
  return {
    sessionId: generateSessionId(projectId, episodeId, userId),
    userId,
    projectId,
    episodeId,
    domain,
    startedAt: new Date().toISOString(),
  }
}
