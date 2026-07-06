import dotenv from 'dotenv'
import { createMastra } from './create-mastra'
import { studioAgents } from './agents/registry'
import { studioMcpServers } from './mcp/studio-servers'

dotenv.config({ path: '.env.local', override: true })
dotenv.config({ override: true })

export const mastra = createMastra(studioAgents, {
  storage: null,
  mcpServers: studioMcpServers,
})

const workspace = mastra.getWorkspace?.()
if (workspace) {
  void workspace
    .init()
    .then(() => {
      console.log(`📂 [Mastra Studio] Workspace ready (${workspace.status})`)
    })
    .catch(err => {
      console.warn('⚠️ [Mastra Studio] Workspace init failed:', err)
    })
}

console.log(
  `🚀 [Mastra Studio] Registered ${Object.keys(studioAgents).length} agents:`,
  Object.values(studioAgents)
    .map(a => a.id)
    .join(', '),
)
console.log(
  `🔌 [Mastra Studio] Registered ${Object.keys(studioMcpServers).length} MCP server(s):`,
  Object.keys(studioMcpServers).join(', '),
)
