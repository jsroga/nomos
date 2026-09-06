'use client'

import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/storyteller-page-wire'
import { submitBeatDraftVerdict } from '@/domains/storyteller/ui/QuestionCard/BeatDraftVerdictToolUI'
import { useQueuedVerdicts } from '@/domains/storyteller/state/hooks/useQueuedVerdicts'
import { BeatDraftVerdictCopy } from '@/domains/storyteller/core/constants/beat-draft-verdict-copy'

enum QueuedVerdictsCopy {
  Title = 'Queued editorial verdicts',
  Empty = 'No queued verdicts',
}

interface QueuedVerdictsListProps {
  projectId: string
}

async function settleQueuedVerdict(
  runId: string,
  verdict: StorytellerWorkflowVerdict,
  refresh: () => Promise<void>
): Promise<void> {
  try {
    await submitBeatDraftVerdict(runId, verdict)
    await refresh()
  } catch {
    // Host persist already reported via resume response.
  }
}

export function QueuedVerdictsList({ projectId }: QueuedVerdictsListProps) {
  const { runIds, refresh } = useQueuedVerdicts(projectId)

  return (
    <div className="mb-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground">{QueuedVerdictsCopy.Title}</p>
      {runIds.length === 0 ? (
        <p className="text-xs text-muted-foreground">{QueuedVerdictsCopy.Empty}</p>
      ) : (
        runIds.map(runId => (
          <div key={runId} className="flex flex-wrap items-center gap-2">
            <span className="truncate text-xs">{runId}</span>
            <Button
              size={ButtonSizeKey.Sm}
              variant={ButtonVariantKey.Outline}
              onClick={() => {
                void settleQueuedVerdict(runId, StorytellerWorkflowVerdict.Approve, refresh)
              }}
            >
              {BeatDraftVerdictCopy.ApproveLabel}
            </Button>
            <Button
              size={ButtonSizeKey.Sm}
              variant={ButtonVariantKey.Outline}
              onClick={() => {
                void settleQueuedVerdict(runId, StorytellerWorkflowVerdict.Revise, refresh)
              }}
            >
              {BeatDraftVerdictCopy.ReviseLabel}
            </Button>
            <Button
              size={ButtonSizeKey.Sm}
              variant={ButtonVariantKey.Outline}
              onClick={() => {
                void settleQueuedVerdict(runId, StorytellerWorkflowVerdict.Kill, refresh)
              }}
            >
              {BeatDraftVerdictCopy.KillLabel}
            </Button>
          </div>
        ))
      )}
    </div>
  )
}
