import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveProjectRoot } from '../project-root'
import {
  createInstanceStudioWorkspace,
  resolveStudioSandboxPath,
} from '../studio-workspace'
import {
  STUDIO_AGENT_DESCRIPTION_MAX,
  StudioSandboxSecretName,
} from '../constants/studio-workspace'
import { PromptCatalogJoin } from '@/shared/agent-kernel/prompts/constants/prompt-catalog'
import { EDITOR_INSTRUCTIONS_ONLY } from '../editor-permissions'
import { studioAgents } from '../agents/constants/registry'
import { qualityImproverAgent } from '../quality-improver'
import { studioMcpServers } from '../mcp/studio-servers'
import { classifyOpenRouterCreditError, CreditHaltKind } from '../quality-improver/credits'
import { OpenRouterCreditNeedle } from '../quality-improver/constants'

const MASTRA_INDEX = join(process.cwd(), 'src/mastra/index.ts')
const CREATE_MASTRA = join(process.cwd(), 'src/shared/agent-kernel/mastra/create-mastra.ts')
const STUDIO_WORKSPACE = join(process.cwd(), 'src/shared/agent-kernel/mastra/studio-workspace.ts')
const STORYTELLER_RUNTIME = join(
  process.cwd(),
  'src/domains/storyteller/core/io/mastra-runtime.ts',
)
const GAME_RUNTIME = join(process.cwd(), 'src/domains/game-design/core/io/mastra-runtime.ts')
const LOOP_RUNTIME = join(process.cwd(), 'src/domains/loop-creator/core/io/mastra-runtime.ts')
const MARKET_ANALYST = join(
  process.cwd(),
  'src/domains/loop-creator/ai/agents/market-analyst/index.ts',
)
const ASSISTANT_ROUTE = join(process.cwd(), 'src/app/api/assistant/[agentId]/route.ts')
const MASTRA_SERVER_MCP = join(
  process.cwd(),
  'node_modules/@mastra/server/dist/server/handlers/mcp.js',
)

function descriptionOf(agent: { getDescription: () => string }): string {
  return agent.getDescription()
}

describe('Studio workspace and writer cards', () => {
  it('sandbox basePath is not the repo root and does not list secrets', () => {
    const sandbox = resolveStudioSandboxPath()
    const root = resolveProjectRoot()
    expect(sandbox).not.toBe(root)
    expect(sandbox.startsWith(join(root, '.local'))).toBe(true)
    createInstanceStudioWorkspace()
    const names = readdirSync(sandbox)
    expect(names).not.toContain(StudioSandboxSecretName.EnvLocal)
    expect(names).not.toContain(StudioSandboxSecretName.Env)
    expect(names).not.toContain(StudioSandboxSecretName.Git)
    expect(names).not.toContain(StudioSandboxSecretName.NodeModules)
    const createSrc = readFileSync(CREATE_MASTRA, 'utf8')
    expect(createSrc).toContain('createInstanceStudioWorkspace')
    expect(createSrc).not.toContain('resolveProjectRoot()')
    const workspaceSrc = readFileSync(STUDIO_WORKSPACE, 'utf8')
    expect(workspaceSrc).toContain('contained: true')
  })

  it('writer agents inherit the instance workspace; they do not mount persona skill packs', () => {
    const workspaceSrc = readFileSync(STUDIO_WORKSPACE, 'utf8')
    expect(workspaceSrc).not.toMatch(/skills:\s*\[/)
    expect(workspaceSrc).not.toContain('createWriterStudioWorkspace')
    const grrmConfig = readFileSync(
      join(process.cwd(), 'src/mastra/agents/grrm-author/config.ts'),
      'utf8',
    )
    expect(grrmConfig).not.toContain('workspace:')
    const runtimeSrc = readFileSync(STORYTELLER_RUNTIME, 'utf8')
    expect(runtimeSrc).toContain('[MuseAgentId.Muse]: museAgent')
    expect(runtimeSrc).toContain('[MuseAgentId.Ranker]: museRankerAgent')
    expect(readFileSync(GAME_RUNTIME, 'utf8')).not.toContain('createWriterStudioWorkspace')
    expect(readFileSync(LOOP_RUNTIME, 'utf8')).not.toContain('createWriterStudioWorkspace')
    expect(readFileSync(MARKET_ANALYST, 'utf8')).not.toContain('createWriterStudioWorkspace')
    expect(readFileSync(MARKET_ANALYST, 'utf8')).not.toContain('SKILLS_DIR')
  })

  it('studio stubs and quality-improver have short descriptions', () => {
    const descriptions = [
      ...Object.values(studioAgents).map(descriptionOf),
      qualityImproverAgent.getDescription(),
    ]
    for (const description of descriptions) {
      expect(description.length).toBeGreaterThan(0)
      expect(description.length).toBeLessThanOrEqual(STUDIO_AGENT_DESCRIPTION_MAX)
      expect(description).toContain(PromptCatalogJoin.Domain)
      expect(description).not.toContain('#')
      expect(description).not.toContain('run_beat_draft')
      expect(description).not.toContain('beat-draft-workflow')
    }
  })

  it('hour-bot stays instructions-only and never git-commits', () => {
    const toolsSrc = readFileSync(
      join(process.cwd(), 'src/shared/agent-kernel/mastra/quality-improver/tools.ts'),
      'utf8',
    )
    expect(toolsSrc).not.toContain('git commit')
    expect(toolsSrc).not.toContain('sourceControl')
    expect(toolsSrc).not.toContain('update_world_bible')
    expect(toolsSrc).not.toContain('run_beat_draft_workflow')
    expect(readFileSync(join(process.cwd(), 'src/shared/agent-kernel/mastra/quality-improver/agent.ts'), 'utf8')).toContain(
      'EDITOR_INSTRUCTIONS_ONLY',
    )
    expect(readFileSync(STORYTELLER_RUNTIME, 'utf8')).toContain('EDITOR_INSTRUCTIONS_AND_TOOL_MEMBERSHIP')
    expect(readFileSync(join(process.cwd(), 'src/shared/agent-kernel/mastra/editor-permissions.ts'), 'utf8')).toContain(
      'tools: true',
    )
    expect(EDITOR_INSTRUCTIONS_ONLY).toEqual({ instructions: true })
  })

  it('Studio registers MCP catalog; Mastra server has GET /mcp/v0/servers', () => {
    expect(Object.keys(studioMcpServers).length).toBeGreaterThan(0)
    expect(readFileSync(MASTRA_INDEX, 'utf8')).toContain('mcpServers: studioMcpServers')
    expect(readFileSync(MASTRA_SERVER_MCP, 'utf8')).toContain('/mcp/v0/servers')
  })

  it('Studio CLI omits hollow loop-creator specialists', () => {
    const src = readFileSync(MASTRA_INDEX, 'utf8')
    expect(src).toContain('loopCreatorStudioAgents')
    expect(src).not.toContain('...loopCreatorRuntimeAgents')
  })

  it('quality-improver is Studio-only and not on /api/assistant', () => {
    expect(readFileSync(MASTRA_INDEX, 'utf8')).toContain('qualityImproverAgent')
    expect(readFileSync(ASSISTANT_ROUTE, 'utf8')).not.toContain('quality-improver')
    expect(readFileSync(ASSISTANT_ROUTE, 'utf8')).not.toContain('qualityImproverAgent')
  })

  it('treats empty-wallet 402 as a hard stop and in-flight as retry-once', () => {
    expect(classifyOpenRouterCreditError(new Error(OpenRouterCreditNeedle.Insufficient))).toBe(
      CreditHaltKind.Insufficient,
    )
    expect(classifyOpenRouterCreditError(new Error(OpenRouterCreditNeedle.InFlight))).toBe(
      CreditHaltKind.InFlight,
    )
  })
})
