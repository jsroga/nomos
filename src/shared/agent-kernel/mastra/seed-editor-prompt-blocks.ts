import type { Mastra } from '@mastra/core/mastra'
import { readdirSync } from 'node:fs'
import {
  fileAgentsRootDir,
  loadAgentInstructions,
} from './load-agent-instructions'
import { promptRepository } from '../prompts/repository'

const BRIEF_ID_PREFIX = 'brief-'
const REGISTRY_ID_PREFIX = 'registry-'
const SEED_FAILED_LOG = '⚠️ [Mastra Editor] Prompt-block seed skipped:'

enum EditorPromptBlockKind {
  FileAgentBrief = 'file-agent-brief',
  CorePrompt = 'core-prompt',
}

function listFileAgentIds(): string[] {
  try {
    return readdirSync(fileAgentsRootDir(), { withFileTypes: true })
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
  } catch {
    return []
  }
}

function readBrief(agentId: string): string | null {
  try {
    return loadAgentInstructions(agentId)
  } catch {
    return null
  }
}

/**
 * Idempotent Editor prompt-block seed from file-based agent briefs and the
 * core prompt registry. Safe to call on every storage warm.
 */
export async function seedEditorPromptBlocks(mastra: Mastra): Promise<void> {
  const editor = mastra.getEditor()
  if (!editor) return

  try {
    for (const agentId of listFileAgentIds()) {
      const content = readBrief(agentId)
      if (!content) continue
      const id = `${BRIEF_ID_PREFIX}${agentId}`
      const existing = await editor.prompt.getById(id)
      if (existing) continue
      await editor.prompt.create({
        id,
        name: agentId,
        content,
        metadata: { kind: EditorPromptBlockKind.FileAgentBrief },
      })
    }

    for (const definition of promptRepository.listRegistered()) {
      const id = `${REGISTRY_ID_PREFIX}${definition.name}`
      const existing = await editor.prompt.getById(id)
      if (existing) continue
      await editor.prompt.create({
        id,
        name: definition.name,
        content: definition.text,
        metadata: { kind: EditorPromptBlockKind.CorePrompt },
      })
    }
  } catch (err: unknown) {
    console.warn(SEED_FAILED_LOG, err)
  }
}
