/**
 * Mastra CLI entry — canonical export at src root.
 * Studio implementation lives in shared/agent-kernel/mastra.
 *
 * The storyteller registration import MUST come first (imports execute in
 * order): it pushes the real domain agents + workflows into the kernel
 * runtime registry, which the Studio entry consumes when constructing the
 * instance. Without it, Studio falls back to the marked stub agents.
 */
import '@/domains/storyteller/core/io/mastra-runtime'
import '@/domains/game-design/core/io/mastra-runtime'
import '@/domains/loop-creator/core/io/mastra-runtime'

export { mastra } from './shared/agent-kernel/mastra'
