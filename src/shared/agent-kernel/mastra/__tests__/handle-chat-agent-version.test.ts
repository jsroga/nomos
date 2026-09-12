import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { FileAgentCatalogId } from '@/shared/agent-kernel/prompts/constants/prompt-catalog'
import { MastraAgentVersionStatus } from '@/shared/agent-kernel/mastra/constants/editor'
import {
  EditorOverlayField,
} from '@/shared/agent-kernel/mastra/constants/editor-code-path'
import {
  editorAgentOverlayFile,
  setEditorOverlayRootForTests,
} from '@/shared/agent-kernel/mastra/editor-overlay'
import { handleChatAgentVersion } from '@/shared/agent-kernel/mastra/handle-chat-agent-version'

enum OverlayBrief {
  ToolsOnly = 'tools-only',
  WithInstructions = 'You are the Storyteller.',
}

function writeOverlay(dir: string, file: string, data: Record<string, unknown>): void {
  const target = join(dir, file)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(data)}\n`, FileEncoding.Utf8)
}

describe('handleChatAgentVersion', () => {
  afterEach(() => {
    setEditorOverlayRootForTests(null)
  })

  it('requests draft when overlay tools exist without instructions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'chat-version-draft-'))
    writeOverlay(dir, editorAgentOverlayFile(FileAgentCatalogId.Storyteller), {
      [EditorOverlayField.Tools]: { [OverlayBrief.ToolsOnly]: {} },
    })
    setEditorOverlayRootForTests(dir)
    expect(handleChatAgentVersion(FileAgentCatalogId.Storyteller)).toEqual({
      status: MastraAgentVersionStatus.Draft,
    })
  })

  it('requests published when overlay JSON has instructions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'chat-version-published-'))
    writeOverlay(dir, editorAgentOverlayFile(FileAgentCatalogId.Storyteller), {
      [EditorOverlayField.Instructions]: OverlayBrief.WithInstructions,
      [EditorOverlayField.Tools]: { [OverlayBrief.ToolsOnly]: {} },
    })
    setEditorOverlayRootForTests(dir)
    expect(handleChatAgentVersion(FileAgentCatalogId.Storyteller)).toEqual({
      status: MastraAgentVersionStatus.Published,
    })
  })
})
