'use client'

import { ApprovalActionStatus } from '@/shared/agent-kernel/action-wire'
import { Timeline, ActionApprovalModal } from '../storyteller-dynamic-imports'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'
import { createStorytellerActionApprovalHandlers } from './useStorytellerActionApproval'

export function StorytellerPageModals(props: StorytellerPageSlices) {
  const { core, chat, phase } = props
  const {
    currentEpisodeId,
    beats,
    setSelectedBeatId,
    selectedBeatId,
    pendingQuestions,
    reviewModalAction,
    setReviewModalAction,
  } = core
  const { messages } = chat
  const { PhaseBackConfirmDialog } = phase

  const { approve, reject } = createStorytellerActionApprovalHandlers(props)

  return (
    <>
      <Timeline
        episodeId={currentEpisodeId}
        beats={beats.map(beat => ({
          id: beat.id,
          sequence: beat.sequence,
          logline: beat.logline,
          beatType: beat.beatType,
          status: beat.status ?? 'proposed',
        }))}
        onBeatSelect={setSelectedBeatId}
        selectedBeatId={selectedBeatId}
        pendingQuestions={pendingQuestions}
      />

      {PhaseBackConfirmDialog}

      {reviewModalAction && (
        <ActionApprovalModal
          action={reviewModalAction.action}
          agentName={reviewModalAction.agentName}
          isOpen={!!reviewModalAction}
          isProcessing={
            messages[reviewModalAction.messageIndex]?.actions?.[reviewModalAction.actionIndex]
              ?.status === ApprovalActionStatus.EXECUTING
          }
          onClose={() => setReviewModalAction(null)}
          onApprove={() => approve(reviewModalAction)}
          onReject={() => reject(reviewModalAction)}
        />
      )}
    </>
  )
}
