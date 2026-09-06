'use client'

import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { StorytellerWorkflowVerdict } from '@/domains/storyteller/core/storyteller-page-wire'
import { submitBeatDraftVerdict } from '@/domains/storyteller/ui/QuestionCard/BeatDraftVerdictToolUI'
import { useQueuedVerdicts } from '@/domains/storyteller/state/hooks/useQueuedVerdicts'
import { BeatDraftVerdictCopy } from '@/domains/storyteller/core/constants/beat-draft-verdict-copy'
import { queuedVerdictsListVisible } from '@/domains/storyteller/core/workflow/queued-verdicts'

enum QueuedVerdictsCopy {
  Title = 'Waiting for your verdict',
  Body = 'A beat draft is paused. Approve it, send it back with a note, or discard it.',
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
  if (!queuedVerdictsListVisible(runIds)) return null

  return (
    <div className="mb-3 space-y-2 rounded-md border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-foreground">{QueuedVerdictsCopy.Title}</p>
      <p className="text-xs text-muted-foreground">{QueuedVerdictsCopy.Body}</p>
      {runIds.map(runId => (
        <div key={runId} className="flex flex-wrap items-center gap-2">
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
      ))}
    </div>
  )
}
