import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { ARTIFACT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/artifact-draft-contract'
import { BEAT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import { FIX_INCONSISTENCIES_WORKFLOW_ID } from '@/domains/storyteller/ai/workflows/fix-inconsistencies-contract'
import { bindStorytellerWorkflowRegistry } from '../storyteller-workflow-registry'

describe('bindStorytellerWorkflowRegistry', () => {
  it('registers one key per contract id', () => {
    const bound = bindStorytellerWorkflowRegistry({
      beatDraft: 'beat',
      artifactDraft: 'artifact',
      fixInconsistencies: 'fix',
    })
    expect(bound).toEqual({
      [BEAT_DRAFT_WORKFLOW_ID]: 'beat',
      [ARTIFACT_DRAFT_WORKFLOW_ID]: 'artifact',
      [FIX_INCONSISTENCIES_WORKFLOW_ID]: 'fix',
    })
    expect(Object.keys(bound)).toHaveLength(3)
  })

  it('binds production Mastra keys so getWorkflow(contract id) succeeds', () => {
    const runtime = readFileSync('src/domains/storyteller/core/io/mastra-runtime.ts', 'utf8')
    expect(runtime).toContain('bindStorytellerWorkflowRegistry')
    expect(runtime).toContain('storytellerRuntimeWorkflows')
    const beatTool = readFileSync('src/domains/storyteller/ai/tools/workflow-tool.ts', 'utf8')
    expect(beatTool).toContain('getWorkflow(BEAT_DRAFT_WORKFLOW_ID)')
    const artifact = readFileSync('src/domains/storyteller/core/io/start-artifact-draft.ts', 'utf8')
    expect(artifact).toContain('getWorkflow(ARTIFACT_DRAFT_WORKFLOW_ID)')
    const fixRun = readFileSync('src/domains/storyteller/core/io/fix-inconsistencies-run.ts', 'utf8')
    expect(fixRun).toContain('getWorkflow(FIX_INCONSISTENCIES_WORKFLOW_ID)')
    expect(fixRun).toContain('createRun({ resourceId: projectId })')
  })
})
