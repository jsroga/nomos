import { BeatDraftWorkflowStatus } from '@/domains/storyteller/ai/constants/workflow-tool'
import { StorytellerDefaultTitle } from '@/domains/storyteller/core/storyteller-page-wire'

export enum ToolResultOutcomeKind {
  Questions = 'questions',
  Info = 'info',
  Navigation = 'navigation',
  Action = 'action',
  None = 'none',
}

export enum ToolResultDetectedSection {
  Beats = 'beats',
}

export enum ToolResultPayloadField {
  Section = 'section',
  Message = 'message',
  BeatId = 'beatId',
  Id = 'id',
  Beat = 'beat',
  DeletedId = 'deletedId',
  Status = 'status',
  UpdatedFields = 'updatedFields',
  Success = 'success',
  Output = 'output',
  Title = 'title',
}

export enum ManageBeatOperationToken {
  Created = 'created',
  Updated = 'updated',
  Deleted = 'deleted',
  Approved = 'approved',
  Locked = 'locked',
}

export const BEAT_PIPELINE_COMPLETED_MESSAGE = 'Beat pipeline completed.'

export const BEAT_DRAFT_COMPLETED_STATUS = BeatDraftWorkflowStatus.Completed

export const MANAGE_BEAT_UNTITLED_LABEL = StorytellerDefaultTitle.Untitled
