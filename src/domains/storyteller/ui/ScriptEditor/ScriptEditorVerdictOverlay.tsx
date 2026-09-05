'use client'

import type { FC } from 'react'
import {
  submitBeatDraftVerdict,
  verdictQuestionFromResult,
  type SuspendedBeatDraftResult,
} from '@/domains/storyteller/ui/QuestionCard/BeatDraftVerdictToolUI'
import { QuestionCard } from '@/domains/storyteller/ui/QuestionCard/QuestionCard'

export type { SuspendedBeatDraftResult }

export async function settleManuscriptSectionVerdict(
  pending: SuspendedBeatDraftResult,
  answer: string | string[],
  additionalFeedback?: string
): Promise<{ ok: boolean; result?: unknown; errorText?: string }> {
  return submitBeatDraftVerdict(pending.runId, answer, additionalFeedback)
}

export const ScriptEditorVerdictOverlay: FC<{
  pending: SuspendedBeatDraftResult | null
  onSettled: (resume: { ok: boolean; result?: unknown }) => void
}> = ({ pending, onSettled }) => {
  if (!pending) return null
  return (
    <div className="absolute inset-x-0 bottom-0 z-10 max-h-[50%] overflow-y-auto border-t border-border/40 bg-background/95 p-4">
      <QuestionCard
        question={verdictQuestionFromResult(pending)}
        onAnswer={(answer, additionalFeedback) => {
          void (async () => {
            try {
              const resumeResult = await settleManuscriptSectionVerdict(
                pending,
                answer,
                additionalFeedback
              )
              onSettled(resumeResult)
            } catch {
              onSettled({ ok: false })
            }
          })()
        }}
      />
    </div>
  )
}
