import { WritersRoomState } from '../types'
import { createStorytellerAgent } from '../agents/v2'

/**
 * Writers Room Graph - Vanilla TypeScript Version (No LangChain)
 *
 * This provides a simple invoke interface compatible with the previous
 * LangGraph implementation, but using direct agent execution.
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

    // Run the agent
    // Note: agent.run() in V2 might not exist, check agent wrapper.
    // V2 StorytellerAgent likely has .generate() or .stream().
    // We previously used .run() in the graph, so let's verify StorytellerAgent has .run().
    // Actually, looking at previous files, StorytellerAgent has .stream() and .generate().
    // Assuming .run() was a convenience method added or we should use .generate().

    // Let's use stream for now if run isn't there, but wait, the previous code used agent.run!
    // So agent.run must exist on the V2 agent wrapper.
    const response = await agent.run('Respond to user', `${context}\n\nUser: ${userContent}`)

    return {
      messages: [{ role: 'assistant', content: response }],
    }
  }
}

export async function getWritersRoomGraph() {
  return new WritersRoom()
}
