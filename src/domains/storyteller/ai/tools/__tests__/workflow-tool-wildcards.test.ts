import { beforeEach, describe, expect, it, vi } from 'vitest'

const start = vi.fn()
const createRun = vi.fn(async () => ({ start, runId: 'run-1' }))
const getWorkflow = vi.fn(() => ({ createRun }))

vi.mock('@/shared/agent-kernel', () => ({
  getMastraInstance: () => ({ getWorkflow }),
}))

import { noopObserve } from '@mastra/core/tools'
import { runBeatDraftWorkflowTool } from '../workflow-tool'
import { BeatDraftWorkflowStatus } from '@/domains/storyteller/ai/constants/workflow-tool'

describe('run_beat_draft_workflow wildcards', () => {
  beforeEach(() => {
    start.mockReset()
    start.mockResolvedValue({ status: BeatDraftWorkflowStatus.Suspended, steps: {} })
  })

  it('forwards wildcards: true on run.start', async () => {
    const execute = runBeatDraftWorkflowTool.execute
    if (!execute) throw new Error('missing execute')
    await execute(
      {
        projectId: '11111111-1111-4111-8111-111111111111',
        episodeId: '22222222-2222-4222-8222-222222222222',
        brief: 'Vera confronts Marcus',
        wildcards: true,
      },
      { observe: noopObserve }
    )

    expect(start.mock.calls[0]?.[0]?.inputData?.wildcards).toBe(true)
  })
})
