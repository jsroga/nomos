import { afterEach, describe, expect, it, vi } from 'vitest'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/storyteller-page-wire'
import {
  artifactDraftOverlayHandlers,
  settleArtifactDraftVerdict,
} from '../artifact-draft-overlay'

describe('artifact-draft overlay handlers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('Accept resumes with approve', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, output: { persisted: true } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await settleArtifactDraftVerdict(
      'run-artifact-1',
      StorytellerWorkflowVerdict.Approve
    )

    expect(result.ok).toBe(true)
    expect(result.persisted).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/storyteller/workflow/resume',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          runId: 'run-artifact-1',
          selectedOption: StorytellerWorkflowVerdict.Approve,
        }),
      })
    )
  })

  it('Reject resumes with kill and does not persist', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, output: { persisted: false } }),
    })
    vi.stubGlobal('fetch', fetchMock)
    const onSettled = vi.fn()
    const handlers = artifactDraftOverlayHandlers('run-artifact-2', onSettled)
    await handlers.onReject()

    expect(onSettled).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/storyteller/workflow/resume',
      expect.objectContaining({
        body: JSON.stringify({
          runId: 'run-artifact-2',
          selectedOption: StorytellerWorkflowVerdict.Kill,
        }),
      })
    )
    expect(
      (await settleArtifactDraftVerdict('run-artifact-2', StorytellerWorkflowVerdict.Kill))
        .persisted
    ).toBe(false)
  })
})
