import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARTIFACT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
import { BEAT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import { FIX_INCONSISTENCIES_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import {
  bindStorytellerWorkflowRegistry,
  StorytellerWorkflowExportName,
} from '../storyteller-workflow-registry'

describe('bindStorytellerWorkflowRegistry', () => {
  it('registers kebab-case contract ids and camelCase export names', () => {
    const bound = bindStorytellerWorkflowRegistry({
      beatDraft: 'beat',
      artifactDraft: 'artifact',
      fixInconsistencies: 'fix',
    })
    expect(bound[BEAT_DRAFT_WORKFLOW_ID]).toBe('beat')
    expect(bound[StorytellerWorkflowExportName.BeatDraft]).toBe('beat')
    expect(bound[ARTIFACT_DRAFT_WORKFLOW_ID]).toBe('artifact')
    expect(bound[StorytellerWorkflowExportName.ArtifactDraft]).toBe('artifact')
    expect(bound[FIX_INCONSISTENCIES_WORKFLOW_ID]).toBe('fix')
    expect(bound[StorytellerWorkflowExportName.FixInconsistencies]).toBe('fix')
  })

  it('binds production Mastra keys so getWorkflow(contract id) succeeds', () => {
    const runtime = readFileSync('src/domains/storyteller/core/io/mastra-runtime.ts', 'utf8')
    expect(runtime).toContain('bindStorytellerWorkflowRegistry')
    expect(runtime).toContain('storytellerRuntimeWorkflows')
    const beatTool = readFileSync('src/domains/storyteller/ai/tools/workflow-tool.ts', 'utf8')
    expect(beatTool).toContain('getWorkflow(BEAT_DRAFT_WORKFLOW_ID)')
    const artifact = readFileSync('src/domains/storyteller/core/io/start-artifact-draft.ts', 'utf8')
    expect(artifact).toContain('getWorkflow(ARTIFACT_DRAFT_WORKFLOW_ID)')
  })
})
