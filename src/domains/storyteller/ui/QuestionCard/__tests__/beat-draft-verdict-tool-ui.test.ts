import { afterEach, describe, expect, it, vi } from 'vitest'
import { BeatDraftWorkflowStatus } from '@/domains/storyteller/ai/constants/workflow-tool'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/storyteller-page-wire'
import {
  parseSuspendedBeatDraftResult,
  submitBeatDraftVerdict,
} from '../BeatDraftVerdictToolUI'

describe('BeatDraftVerdictToolUI', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('parses a suspended workflow tool result', () => {
    const parsed = parseSuspendedBeatDraftResult({
      status: BeatDraftWorkflowStatus.Suspended,
      runId: 'run-1',
      draft: 'INT. HALL',
      critiques: 'NO FINDINGS.',
    })
    expect(parsed).toEqual({
      runId: 'run-1',
      draft: 'INT. HALL',
      critiques: 'NO FINDINGS.',
    })
  })

  it('calls resumeChatWorkflow with the verdict and free-text note', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await submitBeatDraftVerdict(
      'run-9',
      StorytellerWorkflowVerdict.Revise,
      'More subtext'
    )

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/storyteller/workflow/resume',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          runId: 'run-9',
          selectedOption: StorytellerWorkflowVerdict.Revise,
          additionalFeedback: 'More subtext',
        }),
      })
    )
  })
})
