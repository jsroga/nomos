/**
 * Loop Creator Domain Mention Providers
 *
 * Provides mentionable items for the Loop Creator chat:
 * - Entities: mechanics, loops, connections
 * - Agents: loop_planner, balance_analyst, market_analyst
 * - Sections: balanceAnalysis, gameContext
 */

import { MentionProvider, MentionItem, ProjectContext } from '@/domains/chat/mentions/types'

/**
 * Entity Provider - Mechanics, Loops, Connections
 */
export const loopCreatorEntityProvider: MentionProvider = {
  category: 'entity',
  getItems: (filter: string, context: ProjectContext): MentionItem[] => {
    const items: MentionItem[] = []
    const filterLower = filter.toLowerCase()

    // Mechanics
    if (context.mechanics) {
      for (const mech of context.mechanics) {
        if (!filter || mech.name.toLowerCase().includes(filterLower)) {
          items.push({
            id: `mech-${mech.id}`,
            name: mech.name,
            category: 'entity',
            type: 'mechanic',
            icon: 'Cog',
            preview: mech.type || undefined,
            context: mech,
          })
        }
      }
    }

    // Loops
    if (context.loops) {
      for (const loop of context.loops) {
        if (!filter || loop.name.toLowerCase().includes(filterLower)) {
          items.push({
            id: `loop-${loop.id}`,
            name: loop.name,
            category: 'entity',
            type: 'loop',
            icon: 'RefreshCw',
            preview: loop.type || undefined,
            context: loop,
          })
        }
      }
    }

    // Connections (edges between mechanics)
    if (context.connections) {
      for (const conn of context.connections) {
        const name = `${conn.source}→${conn.target}`
        if (!filter || name.toLowerCase().includes(filterLower)) {
          items.push({
            id: `conn-${conn.id}`,
            name: `Connection_${conn.id.slice(0, 6)}`,
            category: 'entity',
            type: 'connection',
            icon: 'GitBranch',
            preview: name.slice(0, 30),
            context: conn,
          })
        }
      }
    }

    return items
  },
}

/**
 * Agent Provider - Loop Creator specialist agents
 */
export const loopCreatorAgentProvider: MentionProvider = {
  category: 'agent',
  getItems: (filter: string): MentionItem[] => {
    const agents: MentionItem[] = [
      {
        id: 'agent-loop-planner',
        name: 'loop_planner',
        category: 'agent',
        type: 'loop_planner',
        icon: 'Layout',
        preview: 'Loop architecture',
      },
      {
        id: 'agent-balance',
        name: 'balance_analyst',
        category: 'agent',
        type: 'balance_analyst',
        icon: 'Scale',
        preview: 'Game balance',
      },
      {
        id: 'agent-market',
        name: 'market_analyst',
        category: 'agent',
        type: 'market_analyst',
        icon: 'TrendingUp',
        preview: 'Market research',
      },
      {
        id: 'agent-mechanic',
        name: 'mechanic_generator',
        category: 'agent',
        type: 'mechanic_generator',
        icon: 'Cog',
        preview: 'Create mechanics',
      },
    ]

    if (!filter) return agents

    const filterLower = filter.toLowerCase()
    return agents.filter(
      a =>
        a.name.toLowerCase().includes(filterLower) || a.preview?.toLowerCase().includes(filterLower)
    )
  },
}

/**
 * Section Provider - Loop Creator data sections
 */
export const loopCreatorSectionProvider: MentionProvider = {
  category: 'section',
  getItems: (filter: string, context: ProjectContext): MentionItem[] => {
    const items: MentionItem[] = []
    const filterLower = filter.toLowerCase()

    // Balance Analysis
    if (!filter || 'balance'.includes(filterLower) || 'analysis'.includes(filterLower)) {
      const hasAnalysis = !!context.balanceAnalysis
      items.push({
        id: 'section-balanceAnalysis',
        name: 'balanceAnalysis',
        category: 'section',
        type: 'balanceAnalysis',
        icon: 'BarChart',
        preview: hasAnalysis ? 'Available' : 'Not generated',
        context: context.balanceAnalysis,
      })
    }

    // Game Context
    if (!filter || 'game'.includes(filterLower) || 'context'.includes(filterLower)) {
      const gc = context.gameContext
      items.push({
        id: 'section-gameContext',
        name: 'gameContext',
        category: 'section',
        type: 'gameContext',
        icon: 'Gamepad2',
        preview: gc?.genre || 'Not defined',
        context: gc,
      })
    }

    // All Mechanics (as a collection)
    if (!filter || 'mechanics'.includes(filterLower) || 'all'.includes(filterLower)) {
      const mechCount = context.mechanics?.length || 0
      items.push({
        id: 'section-allMechanics',
        name: 'allMechanics',
        category: 'section',
        type: 'mechanics',
        icon: 'Cog',
        preview: `${mechCount} mechanics`,
        context: context.mechanics,
      })
    }

    // All Loops (as a collection)
    if (!filter || 'loops'.includes(filterLower) || 'all'.includes(filterLower)) {
      const loopCount = context.loops?.length || 0
      items.push({
        id: 'section-allLoops',
        name: 'allLoops',
        category: 'section',
        type: 'loops',
        icon: 'RefreshCw',
        preview: `${loopCount} loops`,
        context: context.loops,
      })
    }

    return items
  },
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
  mechanics?: any[]
  loops?: any[]
  connections?: any[]
  balanceAnalysis?: any
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
