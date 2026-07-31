/**
 * File-based Studio memory for `storyteller` — inherits Mastra instance storage.
 * Used when the FS agent is registered (code-registered agents still win on
 * the `storyteller` key).
 */
import { createInheritedAgentMemory } from '@/shared/agent-kernel/mastra/studio-memory'

export default createInheritedAgentMemory()
