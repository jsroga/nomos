'use client'

import { makeAssistantToolUI } from '@assistant-ui/react'
import { isPlainObject } from '@/shared/data/json-guards'
import { resumeChatWorkflow, DEFAULT_RESUME_URL } from '@/shared/chat'
import {
  StorytellerWorkflowRunStatus,
  StorytellerWorkflowToolId,
  StorytellerWorkflowVerdict,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { BeatDraftVerdictCopy, BEAT_DRAFT_VERDICT_BLOCK_JOIN, BEAT_DRAFT_VERDICT_QUESTION_ID_PREFIX } from '@/domains/storyteller/core/constants/beat-draft-verdict-copy'
import { QuestionType, QuestionUrgency } from '@/domains/storyteller/core/types/enums'
import type { AgentQuestion } from '@/domains/storyteller/core/types/action-types'
import { QuestionCard } from './QuestionCard'

const DISPLAY_STANDALONE = 'standalone'

export interface SuspendedBeatDraftResult {
  runId: string
  draft: string
  critiques: string
}

export function parseSuspendedBeatDraftResult(result: unknown): SuspendedBeatDraftResult | null {
  const record = isPlainObject(result)
    ? result
    : typeof result === 'string'
      ? (() => {
          try {
            const parsed: unknown = JSON.parse(result)
            return isPlainObject(parsed) ? parsed : null
          } catch {
            return null
          }
        })()
      : null
  if (!record) return null
  if (record.status !== StorytellerWorkflowRunStatus.Suspended) return null
  const runId = typeof record.runId === 'string' ? record.runId : ''
  if (!runId) return null
  return {
    runId,
    draft: typeof record.draft === 'string' ? record.draft : '',
    critiques: typeof record.critiques === 'string' ? record.critiques : '',
  }
}

export function verdictQuestionFromResult(parsed: SuspendedBeatDraftResult): AgentQuestion {
  const summary = [parsed.draft, parsed.critiques].filter(Boolean).join(BEAT_DRAFT_VERDICT_BLOCK_JOIN)
  return {
    id: `${BEAT_DRAFT_VERDICT_QUESTION_ID_PREFIX}${parsed.runId}`,
    agentName: BeatDraftVerdictCopy.AgentName,
    question: summary
      ? `${BeatDraftVerdictCopy.Question}${BEAT_DRAFT_VERDICT_BLOCK_JOIN}${summary}`
      : BeatDraftVerdictCopy.Question,
    questionType: QuestionType.SINGLE_CHOICE,
    options: [
      {
        id: StorytellerWorkflowVerdict.Approve,
        label: BeatDraftVerdictCopy.ApproveLabel,
        description: BeatDraftVerdictCopy.ApproveDescription,
        recommended: true,
      },
      {
        id: StorytellerWorkflowVerdict.ApprovePromote,
        label: BeatDraftVerdictCopy.ApprovePromoteLabel,
        description: BeatDraftVerdictCopy.ApprovePromoteDescription,
      },
      {
        id: StorytellerWorkflowVerdict.Revise,
        label: BeatDraftVerdictCopy.ReviseLabel,
        description: BeatDraftVerdictCopy.ReviseDescription,
      },
      {
        id: StorytellerWorkflowVerdict.Kill,
        label: BeatDraftVerdictCopy.KillLabel,
        description: BeatDraftVerdictCopy.KillDescription,
      },
    ],
    context: BeatDraftVerdictCopy.Context,
    urgency: QuestionUrgency.BLOCKING,
  }
}

export async function submitBeatDraftVerdict(
  runId: string,
  answer: string | string[],
  additionalFeedback?: string
): Promise<{ ok: boolean; result?: unknown; errorText?: string }> {
  const selectedOption = typeof answer === 'string' ? answer : (answer[0] ?? '')
  return resumeChatWorkflow(DEFAULT_RESUME_URL, {
    runId,
    selectedOption,
    additionalFeedback,
  })
}

export const BeatDraftVerdictToolUI = makeAssistantToolUI<unknown, unknown>({
  toolName: StorytellerWorkflowToolId.RunBeatDraft,
  display: DISPLAY_STANDALONE,
  render: ({ result }) => {
    const parsed = parseSuspendedBeatDraftResult(result)
    if (!parsed) return null
    return (
      <QuestionCard
        question={verdictQuestionFromResult(parsed)}
        onAnswer={(answer, additionalFeedback) => {
          void submitBeatDraftVerdict(parsed.runId, answer, additionalFeedback)
        }}
      />
    )
  },
})
