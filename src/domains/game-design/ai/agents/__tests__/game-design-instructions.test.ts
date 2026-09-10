import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { resolveGameDesignInstructions } from '../game-design-agent'
import { createGameDesignToolList } from '../../utils/game-design-tools'
import { GameDesignRetiredToolId } from '../../constants/game-design-tool-wire'
import { GAME_DESIGN_SYSTEM_PROMPT } from '@/shared/agent-kernel/prompts/registry-game-design-prompts'
import { PromptBlockId } from '@/shared/agent-kernel/prompts/constants/prompt-block-ids'
import { recordFromJson } from '@/shared/data/deep-merge'
import { readString } from '@/shared/data/json-guards'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { EditorOverlayField } from '@/shared/agent-kernel/mastra/constants/editor-code-path'

function overlayGameDesignSystem(): string {
  const raw: unknown = JSON.parse(
    readFileSync(join(process.cwd(), 'src/mastra/editor/prompt-blocks.json'), FileEncoding.Utf8),
  )
  const root = recordFromJson(raw)
  const block = recordFromJson(root[PromptBlockId.RegistryGameDesignSystem])
  return readString(block[EditorOverlayField.Content]) ?? ''
}

describe('Game Design Studio instructions', () => {
  it('lists every live tool id and never advertises planner_tool', async () => {
    const resolved = await resolveGameDesignInstructions()
    const overlay = overlayGameDesignSystem()
    const registry = GAME_DESIGN_SYSTEM_PROMPT.text
    const sources = [resolved, overlay, registry]
    for (const text of sources) {
      expect(text).not.toContain(GameDesignRetiredToolId.Planner)
    }
    for (const tool of createGameDesignToolList()) {
      expect(resolved).toContain(tool.id)
      expect(overlay).toContain(tool.id)
      expect(registry).toContain(tool.id)
    }
  })
})
