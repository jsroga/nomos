import { WritersRoomState } from '@/domains/storyteller/core/types/StoryTypes'
import { createStorytellerAgent } from '@/domains/storyteller/agents'

/**
 * Writers Room adapter — thin wrapper around the Mastra Showrunner agent.
 * Legacy name kept for MCP/service callers (`getWritersRoomGraph`).
 */

class WritersRoom {
  async invoke(state: WritersRoomState) {
    const agent = await createStorytellerAgent()

    // Extract the last user message
    const messages = (state as any).messages || []
    const lastMessage = messages[messages.length - 1]
    const userContent = lastMessage?.content || ''

    // Construct context from state
    // We can rely on the agent's internal smarts, but passing minimal context helps
    const context = `
Episode: ${state.episodeId || 'New'}
Bible: ${JSON.stringify(state.seriesBible || {})}
Characters: ${(state.characters || []).map(c => c.name).join(', ')}
        `.trim()

    const response = await agent.run('Respond to user', `${context}\n\nUser: ${userContent}`)

    return {
      messages: [{ role: 'assistant', content: response }],
    }
  }
}

export async function getWritersRoomGraph() {
  return new WritersRoom()
}
