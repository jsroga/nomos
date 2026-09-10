/**
 * One-shot: copy missing Editor overlays from instructions.md + the prompt
 * registry into src/mastra/editor JSON. Skip ids that already exist.
 * Never git-commits.
 *
 *   npx tsx evals/tools/import-studio-prompt-blocks.ts
 *   npx tsx evals/tools/import-studio-prompt-blocks.ts --dry-run
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { recordFromJson } from '@/shared/data/deep-merge'
import { resolveProjectRoot } from '@/shared/agent-kernel/mastra/project-root'
import {
  EditorOverlayField,
  EditorOverlayFile,
  MastraEditorCodePath,
} from '@/shared/agent-kernel/mastra/constants/editor-code-path'
import { editorAgentOverlayFile } from '@/shared/agent-kernel/mastra/editor-overlay'
import { storytellerStudioTools } from '@/shared/agent-kernel/mastra/tools/bundles'
import { FileAgentCatalogId } from '@/shared/agent-kernel/prompts/constants/prompt-catalog'
import { fileAgentCatalogDescription } from '@/shared/agent-kernel/prompts/prompt-catalog-copy'
import { briefPromptBlockId, registryPromptBlockId } from '@/shared/agent-kernel/prompts/prompt-block-id'
import { registerCorePrompts, registerGameDesignPrompts } from '@/shared/agent-kernel/prompts/registry'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import {
  StorytellerAgentId,
  StorytellerAgentLabel,
} from '@/domains/storyteller/ai/constants/agent-identity'

enum ImportArg {
  DryRun = '--dry-run',
}

enum ImportAction {
  WouldCreate = 'would-create',
  Created = 'created',
  Skip = 'skip',
}

enum ImportLog {
  NeverGit = 'import-studio-prompt-blocks does not git commit',
}

const JSON_INDENT = 2
const INSTRUCTIONS_FILE = 'instructions.md'
const AGENTS_DIR = 'src/mastra/agents'

function editorDir(): string {
  return join(resolveProjectRoot(), MastraEditorCodePath.Relative)
}

function readJsonMap(file: EditorOverlayFile): Record<string, unknown> {
  const path = join(editorDir(), file)
  if (!existsSync(path)) return {}
  try {
    return recordFromJson(JSON.parse(readFileSync(path, FileEncoding.Utf8)))
  } catch {
    return {}
  }
}

function writeJsonFile(relativePath: string, data: Record<string, unknown>, dryRun: boolean): void {
  if (dryRun) return
  const path = join(editorDir(), relativePath)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(data, null, JSON_INDENT)}\n`, FileEncoding.Utf8)
}

function writeJsonMap(file: EditorOverlayFile, data: Record<string, unknown>, dryRun: boolean): void {
  writeJsonFile(file, data, dryRun)
}

function logRow(action: ImportAction, id: string): void {
  console.log(`${action} ${id}`)
}

function readBrief(agentId: string): string | null {
  const path = join(resolveProjectRoot(), AGENTS_DIR, agentId, INSTRUCTIONS_FILE)
  if (!existsSync(path)) return null
  return readFileSync(path, FileEncoding.Utf8).trim()
}

function emptyToolConfig(): Record<string, Record<string, never>> {
  const tools: Record<string, Record<string, never>> = {}
  for (const id of Object.keys(storytellerStudioTools)) {
    tools[id] = {}
  }
  return tools
}

function main(): void {
  const dryRun = process.argv.includes(ImportArg.DryRun)
  console.log(ImportLog.NeverGit)

  registerCorePrompts()
  registerGameDesignPrompts()

  const prompts = readJsonMap(EditorOverlayFile.PromptBlocks)
  for (const agentId of Object.values(FileAgentCatalogId)) {
    const id = briefPromptBlockId(agentId)
    if (prompts[id]) {
      logRow(ImportAction.Skip, id)
      continue
    }
    const content = readBrief(agentId)
    if (!content) {
      logRow(ImportAction.Skip, id)
      continue
    }
    logRow(dryRun ? ImportAction.WouldCreate : ImportAction.Created, id)
    prompts[id] = {
      [EditorOverlayField.Name]: agentId,
      [EditorOverlayField.Content]: content,
      [EditorOverlayField.Description]: fileAgentCatalogDescription(agentId),
    }
  }

  for (const definition of promptRepository.listRegistered()) {
    const description = definition.description
    if (!description) continue
    const id = registryPromptBlockId(definition.name)
    if (prompts[id]) {
      logRow(ImportAction.Skip, id)
      continue
    }
    logRow(dryRun ? ImportAction.WouldCreate : ImportAction.Created, id)
    prompts[id] = {
      [EditorOverlayField.Name]: definition.name,
      [EditorOverlayField.Content]: definition.text,
      [EditorOverlayField.Description]: description,
    }
  }
  writeJsonMap(EditorOverlayFile.PromptBlocks, prompts, dryRun)

  const agents = readJsonMap(EditorOverlayFile.Agents)
  const storytellerId = StorytellerAgentId.Storyteller
  const perEntityFile = editorAgentOverlayFile(storytellerId)
  const perEntityExists = existsSync(join(editorDir(), perEntityFile))
  if (agents[storytellerId] || perEntityExists) {
    logRow(ImportAction.Skip, storytellerId)
  } else {
    logRow(dryRun ? ImportAction.WouldCreate : ImportAction.Created, storytellerId)
    const snapshot = {
      [EditorOverlayField.Name]: StorytellerAgentLabel.Storyteller,
      [EditorOverlayField.Description]: fileAgentCatalogDescription(FileAgentCatalogId.Storyteller),
      [EditorOverlayField.Tools]: emptyToolConfig(),
    }
    agents[storytellerId] = snapshot
    writeJsonFile(perEntityFile, snapshot, dryRun)
    writeJsonMap(EditorOverlayFile.Agents, agents, dryRun)
  }
}

main()
