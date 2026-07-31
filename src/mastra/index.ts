/**
 * Mastra CLI entry — `mastra dev` / `mastra build` resolve THIS file.
 *
 * Real domain agents are merged into `createMastra` here (not via registry
 * side-effects). The Mastra bundler tree-shakes unused `registerMastraModule`
 * calls, which produced "0 real, N stub" when registration lived only as an
 * import side-effect in a parent re-export.
 */
import dotenv from 'dotenv'
import { storytellerRuntimeAgents, storytellerRuntimeWorkflows } from '@/domains/storyteller/core/io/mastra-runtime'
import {
  gameDesignRuntimeAgents,
  gameDesignRuntimeWorkflows,
} from '@/domains/game-design/core/io/mastra-runtime'
import { loopCreatorRuntimeAgents } from '@/domains/loop-creator/core/io/mastra-runtime'
import { createMastra, createPostgresStore } from '../shared/agent-kernel/mastra/create-mastra'
import { studioAgents } from '../shared/agent-kernel/mastra/agents/constants/registry'
import { studioMcpServers } from '../shared/agent-kernel/mastra/mcp/studio-servers'
import { consumeMastraRegistrations } from '../shared/agent-kernel/mastra/runtime-registry'

const ENV_LOCAL_PATH = '.env.local'
const LOG_WORKSPACE_INIT_FAILED = '⚠️ [Mastra Studio] Workspace init failed:'
const LIST_SEPARATOR = ', '

dotenv.config({ path: ENV_LOCAL_PATH, override: true })
dotenv.config({ override: true })

// Domain modules also push into the runtime registry at import time — drain so
// a later getMastraInstance() in this process does not double-count, and so
// late-registration warnings stay accurate.
consumeMastraRegistrations()

const registeredAgents = {
  ...storytellerRuntimeAgents,
  ...gameDesignRuntimeAgents,
  ...loopCreatorRuntimeAgents,
}
const registeredWorkflows = {
  ...storytellerRuntimeWorkflows,
  ...gameDesignRuntimeWorkflows,
}

const agents = { ...studioAgents, ...registeredAgents }
const workflowKeys = Object.keys(registeredWorkflows)

export const mastra = createMastra(agents, {
  storage: createPostgresStore(),
  mcpServers: studioMcpServers,
  ...(workflowKeys.length > 0 ? { workflows: registeredWorkflows } : {}),
})

const workspace = mastra.getWorkspace?.()
if (workspace) {
  void workspace
    .init()
    .then(() => {
      console.log(`📂 [Mastra Studio] Workspace ready (${workspace.status})`)
    })
    .catch(err => {
      console.warn(LOG_WORKSPACE_INIT_FAILED, err)
    })
}

const stubOnlyCount = Object.keys(studioAgents).filter(key => !(key in registeredAgents)).length

console.log(
  `🚀 [Mastra Studio] Registered ${Object.keys(agents).length} agents ` +
    `(${Object.keys(registeredAgents).length} real, ${stubOnlyCount} stub-only):`,
  Object.values(agents)
    .map(a => a.id)
    .join(LIST_SEPARATOR),
)
console.log(
  `🔌 [Mastra Studio] Registered ${Object.keys(studioMcpServers).length} MCP server(s):`,
  Object.keys(studioMcpServers).join(LIST_SEPARATOR),
)
