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
