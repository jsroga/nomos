import { describe, expect, it } from 'vitest'
import { STUDIO_AGENT_DESCRIPTION_MAX } from '@/shared/agent-kernel/mastra/constants/studio-workspace'
import {
  FileAgentCatalogId,
  PromptCatalogDomain,
  PromptCatalogJoin,
} from '@/shared/agent-kernel/prompts/constants/prompt-catalog'
import {
  fileAgentCatalogDescription,
  promptCatalogDescription,
} from '@/shared/agent-kernel/prompts/prompt-catalog-copy'
import { EVAL_PROMPT_DESCRIPTIONS } from '@/shared/agent-kernel/prompts/constants/eval-prompt-descriptions'
import { registerCorePrompts, registerGameDesignPrompts } from '@/shared/agent-kernel/prompts/registry'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { GAME_DESIGN_SYSTEM_PROMPT } from '@/shared/agent-kernel/prompts/registry-game-design-prompts'
import type { PromptDefinition } from '@/shared/agent-kernel/prompts/types'

describe('Studio prompt catalog copy', () => {
  it('prefixes domain and stays under the Purpose max', () => {
    const line = promptCatalogDescription(PromptCatalogDomain.Eval, 'Score pacing.')
    expect(line.startsWith(`${PromptCatalogDomain.Eval}${PromptCatalogJoin.Domain}`)).toBe(true)
    expect(line.length).toBeLessThanOrEqual(STUDIO_AGENT_DESCRIPTION_MAX)
    expect(promptCatalogDescription(PromptCatalogDomain.Eval, line)).toBe(line)
  })

  it('labels file-agent briefs as Storyteller', () => {
    const line = fileAgentCatalogDescription(FileAgentCatalogId.GrrmAuthor)
    expect(line.startsWith(`${PromptCatalogDomain.Storyteller}${PromptCatalogJoin.Domain}`)).toBe(true)
  })

  it('registers eval and game-design prompts with domain Description', () => {
    registerCorePrompts()
    registerGameDesignPrompts()
    const registered = promptRepository.listRegistered()
    for (const name of Object.keys(EVAL_PROMPT_DESCRIPTIONS)) {
      const prompt = registered.find((row: PromptDefinition) => row.name === name)
      expect(prompt?.description?.startsWith(`${PromptCatalogDomain.Eval}${PromptCatalogJoin.Domain}`), name).toBe(
        true,
      )
    }
    const gameSystem = registered.find((row: PromptDefinition) => row.name === GAME_DESIGN_SYSTEM_PROMPT.name)
    expect(gameSystem?.description?.startsWith(`${PromptCatalogDomain.GameDesign}${PromptCatalogJoin.Domain}`)).toBe(
      true,
    )
  })
})
