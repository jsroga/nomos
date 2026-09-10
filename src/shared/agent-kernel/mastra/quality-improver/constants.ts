import { MastraAgentVersionStatus } from '@/shared/agent-kernel/mastra/constants/editor'

export enum QualityImproverAgentId {
  QualityImprover = 'quality-improver',
}

export enum QualityImproverAgentName {
  QualityImprover = 'Quality Improver',
}

export enum QualityImproverAgentDescription {
  QualityImprover = 'Studio · Hour-bot for live writer experiments and Editor drafts.',
}

export enum QualityImproverToolId {
  PinLiveDataset = 'pin_live_dataset',
  StartLiveExperiment = 'start_live_experiment',
  ReadExperimentRows = 'read_experiment_rows',
  WriteEditorDraft = 'write_editor_draft',
  WriteRunNote = 'write_run_note',
}

export enum LiveQualityDatasetName {
  StorytellerLiveQuality = 'storyteller-live-quality',
}

export enum HourLoopTarget {
  AgentType = 'agent',
  GrrmAuthor = 'grrm-author',
}

export enum HourLoopBudget {
  WallMs = 3_600_000,
  MaxRuns = 8,
  InFlightRetryAfterMs = 120_000,
}

export enum MastraToolHostKey {
  Datasets = 'datasets',
  GetEditor = 'getEditor',
  GetWorkspace = 'getWorkspace',
}

export enum QualityImproverError {
  DatasetNotFound =
    'Live dataset storyteller-live-quality is missing. Run evals/tools/publish-live-quality-studio.ts',
  EditorMissing = 'Mastra Editor is not configured',
  MastraMissing = 'Mastra instance is missing from tool context',
  WorkspaceMissing = 'Studio sandbox workspace is missing',
}

export enum HourDatasetVersion {
  Fallback = 1,
}

export enum HourRunNoteFile {
  Name = 'hour-run-note.md',
}

export enum OpenRouterCreditNeedle {
  Insufficient = 'Insufficient credits',
  Status402 = '402',
  InFlight = 'in-flight requests',
}

export enum HourExperimentStatus {
  Failed = 'failed',
}

export enum HourExperimentName {
  Live = 'hour-live-quality',
}

export enum QualityImproverGoalPrompt {
  Stop =
    'Stop when wall-clock would exceed 60 minutes, credits are exhausted, or writer scores stopped improving beyond noise. Do not Publish. Do not git commit.',
}

export enum QualityImproverToolDescription {
  PinLiveDataset = 'Pin the git-backed live quality dataset version for this hour.',
  StartLiveExperiment = 'Run one live experiment on grrm-author generate with the hour-loop scorer subset.',
  ReadExperimentRows = 'Read experiment item traces for the hour inspect path.',
  WriteEditorDraft = 'Write an Editor draft overlay on a named writer or critic. Never Publish.',
  WriteRunNote = 'Write the hour run note into the sandbox workspace (Studio-visible).',
}

export enum HourExperimentCopy {
  LiveDescription = 'Hour-bot live writer experiment; no golden fixtures',
}

export const HOUR_LOOP_EDITOR_STATUS = MastraAgentVersionStatus.Draft

export const QUALITY_IMPROVER_INSTRUCTIONS = `You raise storyteller writer scores in Mastra Studio for up to 60 minutes.

Rules:
- Target only the live dataset storyteller-live-quality and agent grrm-author generate.
- Never target storyteller-golden, never beat-draft-workflow (it persists beats).
- Never Publish Editor versions. write_editor_draft is draft-only.
- Never PATCH or add dataset items. Git is for humans.
- On OpenRouter insufficient credits (402, not in-flight): stop immediately. Do not switch models.
- In-flight 402 with Retry-After 120: retry once, then stop.
- After work, write_run_note with Δ, worst items (sentence reasons + trace ids), draft id, 402 or not.

Start: pin_live_dataset → start_live_experiment → read_experiment_rows → optional write_editor_draft → optional second experiment → write_run_note.`
