import { z } from 'zod'

export enum PlanSaveField {
  EpisodeId = 'episodeId',
  ProjectId = 'projectId',
  StoryPlan = 'storyPlan',
  Approved = 'approved',
  CurrentPhase = 'currentPhase',
}

export enum PlanSequencePatchField {
  SequenceId = 'sequenceId',
  Updates = 'updates',
}

export const planSaveRequestSchema = z.object({
  [PlanSaveField.EpisodeId]: z.string().min(1).optional(),
  [PlanSaveField.ProjectId]: z.string().min(1).optional(),
  [PlanSaveField.StoryPlan]: z.unknown().optional(),
  [PlanSaveField.Approved]: z.boolean().optional(),
  [PlanSaveField.CurrentPhase]: z.string().optional(),
})

export const planPatchSequenceRequestSchema = z.object({
  [PlanSaveField.EpisodeId]: z.string().min(1).optional(),
  [PlanSaveField.ProjectId]: z.string().min(1).optional(),
  [PlanSequencePatchField.SequenceId]: z.string().min(1),
  [PlanSequencePatchField.Updates]: z.record(z.unknown()),
})

export type PlanSaveRequest = z.infer<typeof planSaveRequestSchema>
export type PlanPatchSequenceRequest = z.infer<typeof planPatchSequenceRequestSchema>
