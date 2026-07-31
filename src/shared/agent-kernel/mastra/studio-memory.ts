import { Memory } from '@mastra/memory'

/** Match production StorytellerAgent thread window. */
export const INHERITED_AGENT_LAST_MESSAGES = 10

/**
 * Agent Memory that inherits storage from the Mastra instance.
 * Required for Studio to show Memory connected (storage alone is not enough).
 */
export function createInheritedAgentMemory(): Memory {
  return new Memory({
    options: { lastMessages: INHERITED_AGENT_LAST_MESSAGES },
  })
}
