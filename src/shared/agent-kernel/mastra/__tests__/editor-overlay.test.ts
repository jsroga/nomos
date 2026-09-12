import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { FileEncoding } from '@/shared/data/constants/protocol'
import { recordFromJson } from '@/shared/data/deep-merge'
import { readString } from '@/shared/data/json-guards'
import { MAGIC_JUDGE_PROMPT } from '@/shared/agent-kernel/prompts/registry-evaluation-prompts'
import { promptRepository } from '@/shared/agent-kernel/prompts/repository'
import { registerCorePrompts } from '@/shared/agent-kernel/prompts/registry'
import { PromptRegistryName } from '@/shared/agent-kernel/prompts/constants/prompt-block-ids'
import { registryPromptBlockId } from '@/shared/agent-kernel/prompts/prompt-block-id'
import { loadPublishedOrFileBrief } from '@/shared/agent-kernel/mastra/load-published-brief'
import { loadAgentInstructions } from '@/shared/agent-kernel/mastra/load-agent-instructions'
import {
  editorAgentOverlayFile,
  overlayAgentHasInstructions,
  overlayAgentHasTools,
  overlayReadyForPublishedGenerate,
  setEditorOverlayRootForTests,
} from '@/shared/agent-kernel/mastra/editor-overlay'
import {
  EditorOverlayField,
  EditorOverlayFile,
} from '@/shared/agent-kernel/mastra/constants/editor-code-path'
import { omitStoredJudgeCodeScorers } from '@/shared/agent-kernel/scorers/studio-scorers'
import { StoredJudgeScorerId } from '@/shared/agent-kernel/scorers/constants/stored-judge-scorers'
import { seedEditorPromptBlocks } from '@/shared/agent-kernel/mastra/seed-editor-prompt-blocks'
import { FileAgentCatalogId } from '@/shared/agent-kernel/prompts/constants/prompt-catalog'

enum OverlayTestToolId {
  ReadWorldBible = 'read_world_bible',
}

const OVERLAY_BODY = 'OVERLAY_WINS_MAGIC_JUDGE {{content}}'
const INTERPOLATED = 'the-draft'

function writeOverlay(dir: string, file: string, data: Record<string, unknown>): void {
  const target = join(dir, file)
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, `${JSON.stringify(data)}\n`, FileEncoding.Utf8)
}

describe('Editor JSON overlays', () => {
  afterEach(() => {
    setEditorOverlayRootForTests(null)
  })

  it('getPrompt prefers overlay JSON over MAGIC_JUDGE_PROMPT.text', async () => {
    registerCorePrompts()
    const dir = mkdtempSync(join(tmpdir(), 'editor-overlay-'))
    writeOverlay(dir, EditorOverlayFile.PromptBlocks, {
      [registryPromptBlockId(PromptRegistryName.MagicJudge)]: {
        content: OVERLAY_BODY,
      },
    })
    setEditorOverlayRootForTests(dir)
    const text = await promptRepository.getPrompt(PromptRegistryName.MagicJudge, {
      content: INTERPOLATED,
    })
    expect(text).toContain(INTERPOLATED)
    expect(text).not.toBe(MAGIC_JUDGE_PROMPT.text.replace('{{content}}', INTERPOLATED))
    expect(MAGIC_JUDGE_PROMPT.text).not.toContain(OVERLAY_BODY)
  })

  it('falls back to instructions.md when no overlay exists', () => {
    const dir = mkdtempSync(join(tmpdir(), 'editor-overlay-empty-'))
    setEditorOverlayRootForTests(dir)
    expect(loadPublishedOrFileBrief(FileAgentCatalogId.GrrmAuthor)).toBe(
      loadAgentInstructions(FileAgentCatalogId.GrrmAuthor),
    )
  })

  it('interpolates overlay templates', async () => {
    registerCorePrompts()
    const dir = mkdtempSync(join(tmpdir(), 'editor-overlay-vars-'))
    writeOverlay(dir, EditorOverlayFile.PromptBlocks, {
      [registryPromptBlockId(PromptRegistryName.HallucinationJudge)]: {
        content: 'canon={{reference}} out={{output}}',
      },
    })
    setEditorOverlayRootForTests(dir)
    const text = await promptRepository.getPrompt(PromptRegistryName.HallucinationJudge, {
      reference: 'R',
      output: 'O',
    })
    expect(text).toBe('canon=R out=O')
  })

  it('does not treat missing agent tools overlay as a live tool list', () => {
    const dir = mkdtempSync(join(tmpdir(), 'editor-overlay-tools-'))
    setEditorOverlayRootForTests(dir)
    expect(overlayAgentHasTools(FileAgentCatalogId.Storyteller)).toBe(false)
    expect(
      readFileSync(join(process.cwd(), 'src/domains/storyteller/core/io/mastra-runtime.ts'), FileEncoding.Utf8),
    ).toContain('tools: CHAT_ADAPTER_TOOLS')
  })

  it('reads per-agent overlay JSON for tool membership', () => {
    const dir = mkdtempSync(join(tmpdir(), 'editor-overlay-agent-file-'))
    writeOverlay(dir, editorAgentOverlayFile(FileAgentCatalogId.Storyteller), {
      [EditorOverlayField.Tools]: { [OverlayTestToolId.ReadWorldBible]: {} },
    })
    setEditorOverlayRootForTests(dir)
    expect(overlayAgentHasTools(FileAgentCatalogId.Storyteller)).toBe(true)
    expect(overlayAgentHasInstructions(FileAgentCatalogId.Storyteller)).toBe(false)
    expect(overlayReadyForPublishedGenerate(FileAgentCatalogId.Storyteller)).toBe(false)
  })

  it('reads stored overlay instructions when present', () => {
    const dir = mkdtempSync(join(tmpdir(), 'editor-overlay-instructions-'))
    writeOverlay(dir, editorAgentOverlayFile(FileAgentCatalogId.Storyteller), {
      [EditorOverlayField.Instructions]: OverlayTestToolId.ReadWorldBible,
      [EditorOverlayField.Tools]: { [OverlayTestToolId.ReadWorldBible]: {} },
    })
    setEditorOverlayRootForTests(dir)
    expect(overlayAgentHasInstructions(FileAgentCatalogId.Storyteller)).toBe(true)
  })

  it('committed storyteller overlay stores a brief so chat can run', () => {
    expect(overlayAgentHasInstructions(FileAgentCatalogId.Storyteller)).toBe(true)
  })

  it('omits TypeScript judge twins only when stored scorer ids exist', () => {
    const scorers = {
      [StoredJudgeScorerId.Magic]: { id: StoredJudgeScorerId.Magic },
      leftover: { id: 'leftover' },
    }
    const omitted = omitStoredJudgeCodeScorers(scorers, [StoredJudgeScorerId.Magic])
    expect(omitted).not.toHaveProperty(StoredJudgeScorerId.Magic)
    expect(omitted).toHaveProperty('leftover')
    expect(omitStoredJudgeCodeScorers(scorers, [])).toHaveProperty(StoredJudgeScorerId.Magic)
  })

  it('seedEditorPromptBlocks does not rewrite overlay JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'editor-overlay-seed-'))
    const before = { 'brief-grrm-author': { content: 'keep-me' } }
    writeOverlay(dir, EditorOverlayFile.PromptBlocks, before)
    setEditorOverlayRootForTests(dir)
    await seedEditorPromptBlocks()
    const parsed: unknown = JSON.parse(
      readFileSync(join(dir, EditorOverlayFile.PromptBlocks), FileEncoding.Utf8),
    )
    const row = recordFromJson(recordFromJson(parsed)['brief-grrm-author'])
    expect(readString(row.content)).toBe('keep-me')
  })

  it('import script prints dry-run ids and never git-commits', () => {
    const src = readFileSync(
      join(process.cwd(), 'evals/tools/import-studio-prompt-blocks.ts'),
      FileEncoding.Utf8,
    )
    expect(src).toContain('--dry-run')
    expect(src).toContain('does not git commit')
    expect(src).not.toContain('git add')
    expect(src).not.toContain('simple-git')
  })
})
