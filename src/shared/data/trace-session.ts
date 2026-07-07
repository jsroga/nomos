/**
 * Trace session IDs for Mastra `tracingOptions.sessionId` / request context.
 * Groups multi-turn chat within a project or episode.
 */

import { v4 as uuidv4 } from 'uuid'

export function generateSessionId(projectId?: string, episodeId?: string, userId?: string): string {
  if (projectId && episodeId) {
    return `session-${projectId}-${episodeId}`
  }

  if (projectId) {
    return `session-${projectId}`
  }

  if (userId) {
    return `session-user-${userId}-${Date.now()}`
  }

  return `session-${uuidv4()}`
}
