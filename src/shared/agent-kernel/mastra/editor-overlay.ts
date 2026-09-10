// Relative imports: Mastra Studio bundler emits unresolved `@/` into `.mastra/output`.
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { FileEncoding } from '../../data/constants/protocol'
import { recordFromJson } from '../../data/deep-merge'
import { readString } from '../../data/json-guards'
import { resolveProjectRoot } from './project-root'
import {
  EditorOverlayField,
  EditorOverlayFile,
  EditorOverlayJsonSuffix,
  MastraEditorCodePath,
} from './constants/editor-code-path'

export function editorAgentOverlayFile(agentId: string): string {
  return `${EditorOverlayFile.AgentsDir}/${agentId}${EditorOverlayJsonSuffix.Json}`
}

let overlayRootOverride: string | null = null

/** Tests only — points overlay JSON at a temp directory. */
export function setEditorOverlayRootForTests(dir: string | null): void {
  overlayRootOverride = dir
}

export function resolveEditorCodePath(): string {
  if (overlayRootOverride) return overlayRootOverride
  return join(resolveProjectRoot(), MastraEditorCodePath.Relative)
}

function readOverlayMap(file: string): Record<string, unknown> {
  const path = join(resolveEditorCodePath(), file)
  if (!existsSync(path)) return {}
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, FileEncoding.Utf8))
    return recordFromJson(parsed)
  } catch {
    return {}
  }
}

export function readPromptBlockContent(id: string): string | null {
  const row = recordFromJson(readOverlayMap(EditorOverlayFile.PromptBlocks)[id])
  const content = readString(row[EditorOverlayField.Content])
  if (!content || content.trim().length === 0) return null
  return content
}

export function listStoredScorerIds(): string[] {
  return Object.keys(readOverlayMap(EditorOverlayFile.ScorerDefinitions))
}

function toolsNonempty(tools: unknown): boolean {
  if (tools == null) return false
  if (Array.isArray(tools)) return tools.length > 0
  if (typeof tools === 'object') return Object.keys(recordFromJson(tools)).length > 0
  return false
}

function overlayAgentSnapshot(agentId: string): Record<string, unknown> {
  const perEntity = readOverlayMap(editorAgentOverlayFile(agentId))
  if (EditorOverlayField.Tools in perEntity) return perEntity
  return recordFromJson(readOverlayMap(EditorOverlayFile.Agents)[agentId])
}

export function overlayAgentHasTools(agentId: string): boolean {
  return toolsNonempty(overlayAgentSnapshot(agentId)[EditorOverlayField.Tools])
}
