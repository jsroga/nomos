import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { createMastra } from '@/shared/agent-kernel/mastra/create-mastra'
import { FileEncoding } from '@/shared/data/constants/protocol'

vi.mock('@/shared/config/env', async importOriginal => {
  const actual = await importOriginal<typeof import('@/shared/config/env')>()
  return {
    ...actual,
    env: { ...actual.env, VERCEL: undefined },
  }
})

enum EditorConnectSource {
  CreateMastra = 'src/shared/agent-kernel/mastra/create-mastra.ts',
  GetPublished = 'src/shared/agent-kernel/mastra/get-published-agent.ts',
  MastraInstance = 'src/shared/agent-kernel/mastra-instance.ts',
  Seed = 'src/shared/agent-kernel/mastra/seed-editor-prompt-blocks.ts',
  Registry = 'src/shared/agent-kernel/mastra/agents/constants/registry.ts',
  Bundles = 'src/shared/agent-kernel/mastra/tools/bundles.ts',
  Assistant = 'src/app/api/assistant/[agentId]/route.ts',
  Stream = 'src/app/api/storyteller/chat/stream/stream-post-handler.ts',
  StorytellerFs = 'src/mastra/agents/storyteller/agent.ts',
  StorytellerRuntime = 'src/domains/storyteller/core/io/mastra-runtime.ts',
  GameDesignRuntime = 'src/domains/game-design/core/io/mastra-runtime.ts',
  LoopCreatorAgents = 'src/domains/loop-creator/ai/agents/mastra/loop-creator-mastra-agents.ts',
  MentionCatalog = 'src/domains/storyteller/ui/MentionsProvider/constants/mention-catalog.ts',
  ModelMatrix = 'src/domains/storyteller/config/constants/agent-model-matrix.ts',
  BeatDraftDeps = 'src/domains/storyteller/ai/workflows/beat-draft-default-deps.ts',
  PublishedWorkflow = 'src/domains/storyteller/ai/workflows/published-workflow-agents.ts',
  Probe = 'src/app/api/settings/providers/probe/route.ts',
}

function readSource(path: EditorConnectSource): string {
  return readFileSync(path, FileEncoding.Utf8)
}

describe('Mastra Editor connect', () => {
  it('constructs MastraEditor on createMastra', () => {
    const mastra = createMastra({}, { storage: null })
    expect(mastra.getEditor()).toBeTruthy()
    expect(readSource(EditorConnectSource.CreateMastra)).toContain('new MastraEditor')
    expect(readSource(EditorConnectSource.CreateMastra)).toContain('MastraEditorSource.Code')
  })

  it('loads published overlays on live agent paths', () => {
    const getPublished = readSource(EditorConnectSource.GetPublished)
    expect(getPublished).toContain('hasRegisteredAgent')
    expect(getPublished).toContain('listAgents')
    expect(getPublished).toContain('MastraAgentVersionStatus.Published')

    const assistant = readSource(EditorConnectSource.Assistant)
    expect(assistant).toContain('handleChatAgentVersion')
    expect(assistant).toContain('agentVersion:')
    expect(assistant).not.toMatch(/agentVersion:\s*\{\s*status:\s*MastraAgentVersionStatus\.Published/)

    const stream = readSource(EditorConnectSource.Stream)
    expect(stream).toContain('getPublishedAgent')
    expect(stream).not.toContain('createStorytellerAgent')

    expect(readSource(EditorConnectSource.BeatDraftDeps)).toContain('publishedGrrmAuthor')
    expect(readSource(EditorConnectSource.PublishedWorkflow)).toContain('getPublishedAgentOr')
    expect(readSource(EditorConnectSource.MastraInstance)).toContain('seedEditorPromptBlocks')
    expect(readSource(EditorConnectSource.Seed)).toContain('source: code')
    expect(readSource(EditorConnectSource.Seed)).toMatch(
      /export async function seedEditorPromptBlocks[\s\S]*?{\s*return\s*\n}/,
    )
    expect(readSource(EditorConnectSource.CreateMastra)).toContain('MastraEditorSource.Code')
    expect(readSource(EditorConnectSource.CreateMastra)).toContain('codePath:')
    expect(readSource(EditorConnectSource.CreateMastra)).not.toContain('MastraEditorSource.Database')
    expect(readSource(EditorConnectSource.CreateMastra)).not.toContain('sourceControlProvider')
    expect(readSource(EditorConnectSource.CreateMastra)).toContain('registerGameDesignPrompts')
    expect(readSource(EditorConnectSource.Probe)).toContain('EDITOR_DISABLED')
  })

  it('prunes Studio ghosts and council leftovers', () => {
    expect(readSource(EditorConnectSource.Registry)).not.toContain('worldBuilding')
    expect(readSource(EditorConnectSource.Bundles)).not.toContain('consult_')
    expect(readSource(EditorConnectSource.Bundles)).toContain('run_beat_draft_workflow')
    expect(readSource(EditorConnectSource.Bundles)).toContain('get_game_loops')
    expect(readSource(EditorConnectSource.Bundles)).not.toContain('atomic_loom')
    expect(readSource(EditorConnectSource.StorytellerFs)).not.toContain('storytellerChatAgent')

    const mentions = readSource(EditorConnectSource.MentionCatalog)
    expect(mentions).toContain('MentionAgentTypeId.Writer')
    expect(mentions).not.toContain('premise_architect')
    expect(mentions).not.toContain('devils_advocate')

    const matrix = readSource(EditorConnectSource.ModelMatrix)
    expect(matrix).not.toContain('gardener')
    expect(matrix).not.toContain('devils-advocate')
    expect(matrix).toContain('  critic:')
    expect(matrix).toContain('  muse:')
    expect(matrix).toContain('  chat:')
    expect(matrix).toContain('  author:')
    expect(matrix).toContain('  planner:')
    expect(matrix).toContain('  premise:')
  })

  it('registers runtime agents under keys that match agent.id', () => {
    const storyteller = readSource(EditorConnectSource.StorytellerRuntime)
    expect(storyteller).toContain('[CHAT_ADAPTER_ID]: chatAdapterAgent')
    expect(storyteller).toContain('[GrrmAuthorAgentId.GrrmAuthor]')
    expect(storyteller).toContain('[BeatPlannerAgentId.BeatPlanner]')
    expect(storyteller).not.toContain('grrmAuthor:')

    const gameDesign = readSource(EditorConnectSource.GameDesignRuntime)
    expect(gameDesign).toContain('[GameDesignAgentId.GameDesignAgent]')
    expect(gameDesign).not.toContain('gameDesign:')

    const loopCreator = readSource(EditorConnectSource.LoopCreatorAgents)
    expect(loopCreator).toContain('[LoopCreatorMastraAgentId.Supervisor]')
    expect(loopCreator).toContain('[MarketAnalystAgentId.Id]')
  })
})
