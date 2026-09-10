import type { Mastra } from '@mastra/core/mastra'
import { MastraAgentVersionStatus } from './constants/editor'

export enum EditorPromptBlockKind {
  FileAgentBrief = 'file-agent-brief',
  CorePrompt = 'core-prompt',
}

enum EditorPromptBlockMetaKey {
  Kind = 'kind',
}

export type PromptCatalogRow = {
  id: string
  status: string
  description?: string
  activeVersionId?: string
  resolvedVersionId?: string
}

export type PromptCatalogStore = {
  getById: (
    id: string,
    options?: { status?: MastraAgentVersionStatus },
  ) => Promise<PromptCatalogRow | null>
  create: (input: {
    id: string
    name: string
    content: string
    description: string
    metadata: Record<string, string>
  }) => Promise<unknown>
  update: (input: {
    id: string
    description?: string
    status?: MastraAgentVersionStatus
    activeVersionId?: string
  }) => Promise<unknown>
}

type SeededPromptInput = {
  id: string
  name: string
  content: string
  description: string
  kind: EditorPromptBlockKind
}

function hasCatalogDescription(row: PromptCatalogRow | null, expected: string): boolean {
  return Boolean(row && row.description === expected)
}

/**
 * Studio Prompts Description is the published snapshot. A later draft with
 * copy does not show until that version is active.
 */
export async function publishCatalogDescription(
  prompt: PromptCatalogStore,
  id: string,
  expectedDescription: string,
): Promise<boolean> {
  const latest = await prompt.getById(id, { status: MastraAgentVersionStatus.Draft })
  const versionId = latest?.resolvedVersionId
  if (!versionId || latest.description !== expectedDescription) return false

  const published = await prompt.getById(id, { status: MastraAgentVersionStatus.Published })
  if (hasCatalogDescription(published, expectedDescription) && published?.activeVersionId) {
    return false
  }

  await prompt.update({
    id,
    status: MastraAgentVersionStatus.Published,
    activeVersionId: versionId,
  })
  return true
}

export async function upsertPromptCatalogBlock(
  prompt: PromptCatalogStore,
  input: SeededPromptInput,
): Promise<boolean> {
  const metadata = { [EditorPromptBlockMetaKey.Kind]: input.kind }
  const existing = await prompt.getById(input.id, { status: MastraAgentVersionStatus.Draft })
  if (!existing) {
    await prompt.create({
      id: input.id,
      name: input.name,
      content: input.content,
      description: input.description,
      metadata,
    })
    return publishCatalogDescription(prompt, input.id, input.description)
  }
  if (existing.description !== input.description) {
    await prompt.update({ id: input.id, description: input.description })
  }
  return publishCatalogDescription(prompt, input.id, input.description)
}

/**
 * Editor overlays live in committed JSON (`source: code`). Boot must not copy
 * instructions.md onto existing overlay files.
 */
export async function seedEditorPromptBlocks(_mastra?: Mastra): Promise<void> {
  return
}
