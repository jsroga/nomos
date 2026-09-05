import { afterEach, describe, expect, it, vi } from 'vitest'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/storyteller-page-wire'
import { settleManuscriptSectionVerdict } from '../ScriptEditorVerdictOverlay'

describe('settleManuscriptSectionVerdict', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('invokes resumeChatWorkflow for the Draft overlay', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const result = await settleManuscriptSectionVerdict(
      { runId: 'run-draft-1', draft: '', critiques: '' },
      StorytellerWorkflowVerdict.Approve
    )

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/storyteller/workflow/resume',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          runId: 'run-draft-1',
          selectedOption: StorytellerWorkflowVerdict.Approve,
        }),
      })
    )
  })
})
