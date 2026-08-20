import { describe, it, expect } from 'vitest'
import {
  buildStorytellerControllerModes,
  StorytellerControllerMode,
  STORYTELLER_CONTROLLER_ID,
} from '../storyteller-controller'
import {
  readWorldBibleTool,
  updateWorldBibleTool,
  checkContinuityTool,
} from '@/domains/storyteller/ai/tools/bible-tools'
import { checkSectionAlignmentTool } from '@/domains/storyteller/ai/tools/section-alignment-tool'
import { manageBeatTool, listBeatsTool } from '@/domains/storyteller/ai/tools/beat-tools'
import { manageCharacterTool, listCharactersTool } from '@/domains/storyteller/ai/tools/character-tools'
import { manageEpisodeTool, listEpisodesTool } from '@/domains/storyteller/ai/tools/episode-tools'
import { runBeatDraftWorkflowTool } from '@/domains/storyteller/ai/tools/workflow-tool'
import { proposeCharacterFieldsTool } from '@/domains/storyteller/ai/tools/propose-character-fields-tool'

describe('storyteller controller modes (plan-first)', () => {
  const modes = buildStorytellerControllerModes()
  const chat = modes.find(m => m.id === StorytellerControllerMode.Chat)
  const build = modes.find(m => m.id === StorytellerControllerMode.Build)

  it('exposes exactly two modes with a stable controller id', () => {
    expect(STORYTELLER_CONTROLLER_ID).toBe('storyteller-chat')
    expect(modes).toHaveLength(2)
    expect(chat).toBeDefined()
    expect(build).toBeDefined()
  })

  it('defaults to chat and natively transitions chat→build on plan approval', () => {
    expect(chat?.metadata?.default).toBe(true)
    expect(chat?.transitionsTo).toBe(StorytellerControllerMode.Build)
    expect(build?.transitionsTo).toBeUndefined()
  })

  it('chat mode exposes read-only tools + submit_plan and NEVER mutating tools', () => {
    const allow = chat?.availableTools ?? []
    // Reads always available — questions stay instant.
    expect(allow).toContain(readWorldBibleTool.id)
    expect(allow).toContain(listBeatsTool.id)
    expect(allow).toContain(listCharactersTool.id)
    expect(allow).toContain(listEpisodesTool.id)
    expect(allow).toContain(checkContinuityTool.id)
    expect(allow).toContain(checkSectionAlignmentTool.id)
    expect(allow).toContain(proposeCharacterFieldsTool.id)
    expect(allow).toContain('submit_plan')
    // The plan-first invariant: mutating tools are invisible until an approved plan.
    for (const mutating of [
      updateWorldBibleTool,
      manageBeatTool,
      manageCharacterTool,
      manageEpisodeTool,
      runBeatDraftWorkflowTool,
    ]) {
      expect(allow).not.toContain(mutating.id)
    }
  })

  it('build mode carries no allowlist (all tools — full mutating CRUD + workflow)', () => {
    expect(build?.availableTools).toBeUndefined()
  })
})
