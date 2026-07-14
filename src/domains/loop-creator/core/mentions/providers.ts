/**
 * Loop Creator Domain Mention Providers
 *
 * Provides mentionable items for the Loop Creator chat:
 * - Entities: mechanics, loops, connections
 * - Agents: loop_planner, balance_analyst, market_analyst
 * - Sections: balanceAnalysis, gameContext
 */

import type { MentionProvider, ProjectContext } from '@/shared/chat'
import {
  LOOP_CREATOR_AGENT_MENTION_CATALOG,
  MENTION_CATEGORY_AGENT,
  MENTION_CATEGORY_ENTITY,
  MENTION_CATEGORY_SECTION,
} from '@/domains/loop-creator/core/mentions/constants/mention-catalog'
import { entityMentionItems } from '@/domains/loop-creator/core/mentions/mention-entity-items'
import { sectionMentionItems } from '@/domains/loop-creator/core/mentions/mention-section-items'

/**
 * Entity Provider - Mechanics, Loops, Connections
 */
export const loopCreatorEntityProvider: MentionProvider = {
  category: MENTION_CATEGORY_ENTITY,
  getItems: (filter: string, context: ProjectContext) => entityMentionItems(filter, context),
}

/**
 * Agent Provider - Loop Creator specialist agents
 */
export const loopCreatorAgentProvider: MentionProvider = {
  category: MENTION_CATEGORY_AGENT,
  getItems: (filter: string) => {
    if (!filter) return LOOP_CREATOR_AGENT_MENTION_CATALOG

    const filterLower = filter.toLowerCase()
    return LOOP_CREATOR_AGENT_MENTION_CATALOG.filter(
      agent =>
        agent.name.toLowerCase().includes(filterLower) ||
        agent.preview?.toLowerCase().includes(filterLower)
    )
  },
}

/**
 * Section Provider - Loop Creator data sections
 */
export const loopCreatorSectionProvider: MentionProvider = {
  category: MENTION_CATEGORY_SECTION,
  getItems: (filter: string, context: ProjectContext) => sectionMentionItems(filter, context),
}

/**
 * Get all Loop Creator mention providers
 */
export function getLoopCreatorMentionProviders(): MentionProvider[] {
  return [loopCreatorEntityProvider, loopCreatorAgentProvider, loopCreatorSectionProvider]
}

/**
 * Build project context from Loop Creator state
 */
export function buildLoopCreatorProjectContext(data: {
  projectId: string
  mechanics?: ProjectContext['mechanics']
  loops?: ProjectContext['loops']
  connections?: ProjectContext['connections']
  balanceAnalysis?: ProjectContext['balanceAnalysis']
  gameGenre?: string
  gamePlatform?: string
  targetAudience?: string
}): ProjectContext {
  return {
    projectId: data.projectId,
    mechanics: data.mechanics,
    loops: data.loops,
    connections: data.connections,
    balanceAnalysis: data.balanceAnalysis,
    gameContext: {
      genre: data.gameGenre,
      platform: data.gamePlatform,
      targetAudience: data.targetAudience,
    },
  }
}
