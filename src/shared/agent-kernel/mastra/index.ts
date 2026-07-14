import dotenv from 'dotenv'
import { createMastra } from './create-mastra'
import { studioAgents } from './agents/constants/registry'
import { studioMcpServers } from './mcp/studio-servers'
import { consumeMastraRegistrations } from './runtime-registry'

const ENV_LOCAL_PATH = '.env.local'
const LOG_WORKSPACE_INIT_FAILED = '⚠️ [Mastra Studio] Workspace init failed:'
const LIST_SEPARATOR = ', '

dotenv.config({ path: ENV_LOCAL_PATH, override: true })
dotenv.config({ override: true })

// Real domain agents/workflows arrive via the runtime registry (the Studio
// CLI entry `src/mastra.ts` side-effect-imports the storyteller registration
// module before this file runs). Registered agents OVERRIDE same-id stubs;
// stubs without a registered counterpart stay visible as clearly-marked
// Studio-only fallbacks (PLAN-V2 1.1 — no more hardcoded placeholder drift).
const { agents: registeredAgents, workflows: registeredWorkflows } = consumeMastraRegistrations()
const agents = { ...studioAgents, ...registeredAgents }
const workflows = Object.keys(registeredWorkflows).length > 0 ? registeredWorkflows : undefined

export const mastra = createMastra(agents, {
  storage: null,
  mcpServers: studioMcpServers,
  ...(workflows ? { workflows } : {}),
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

console.log(
  `🚀 [Mastra Studio] Registered ${Object.keys(agents).length} agents ` +
    `(${Object.keys(registeredAgents).length} real, ${Object.keys(agents).length - Object.keys(registeredAgents).length} stub):`,
  Object.values(agents)
    .map(a => a.id)
    .join(LIST_SEPARATOR),
)
console.log(
  `🔌 [Mastra Studio] Registered ${Object.keys(studioMcpServers).length} MCP server(s):`,
  Object.keys(studioMcpServers).join(LIST_SEPARATOR),
)
