import '@/shared/data/server-guard'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  VERDICT_STEP_ID,
  beatDraftOutputSchema,
} from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import {
  BeatDraftWorkflowFailurePrefix,
  BeatDraftWorkflowStatus,
  RUN_BEAT_DRAFT_KILLED_MESSAGE,
  RUN_BEAT_DRAFT_SAVED_SUFFIX,
  RUN_BEAT_DRAFT_VERDICT_DEFAULT_REASON,
} from '@/domains/storyteller/ai/constants/workflow-tool'
import { defaultBeatDraftDeps } from '@/domains/storyteller/ai/workflows/beat-draft-default-deps'
import { CanonAudience, formatCanonFor } from '@/domains/storyteller/ai/workflows/beat-draft-canon'
import {
  packManuscriptSectionBrief,
  type ManuscriptSectionScope,
} from '@/domains/storyteller/core/manuscript/pack-manuscript-section-brief'
import type { ManuscriptSpan } from '@/domains/storyteller/core/manuscript/manuscript-span'
import type { ManuscriptMode } from '@/domains/storyteller/core/types/enums'
import type { BeatDraftContext } from '@/domains/storyteller/ai/workflows/beat-draft-deps-types'
import { getMastraInstance } from '@/shared/agent-kernel'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { voiceFingerprintFromUnknown } from '@/domains/storyteller/core/voice/voice-fingerprint'
import type { NamedVoiceFingerprint } from '@/domains/storyteller/core/voice/pack-involved-voice-fingerprints'

export interface StartManuscriptSectionDraftInput {
  projectId: string
  episodeId: string
  beatId: string
  span: ManuscriptSpan | null
  mode: ManuscriptMode
  scope: ManuscriptSectionScope
  spanText?: string
  episodePremise?: string
  characterVoices?: readonly { name: string; voice: unknown }[]
}

export interface StartManuscriptSectionDraftResult {
  runId: string
  status: BeatDraftWorkflowStatus
  message: string
  draft?: string
  critiques?: string
}

enum StartSectionDraftError {
  MissingBeat = 'Beat not found for manuscript section draft',
}

function fingerprintsFromCharacterVoices(
  rows: readonly { name: string; voice: unknown }[]
): NamedVoiceFingerprint[] {
  return rows.map(row => ({
    name: row.name,
    voice: voiceFingerprintFromUnknown(row.voice),
  }))
}

function suspendFields(steps: unknown): { message: string; draft: string; critiques: string } {
  const table = recordFromJson(steps)
  const step = recordFromJson(table[VERDICT_STEP_ID])
  const payload = recordFromJson(step.suspendPayload)
  return {
    message: readString(payload.reason) ?? RUN_BEAT_DRAFT_VERDICT_DEFAULT_REASON,
    draft: readString(payload.draft) ?? '',
    critiques: readString(payload.critiques) ?? '',
  }
}

export async function startManuscriptSectionDraft(
  input: StartManuscriptSectionDraftInput
): Promise<StartManuscriptSectionDraftResult> {
  void input.span
  const ctx: BeatDraftContext = {
    projectId: input.projectId,
    episodeId: input.episodeId,
    brief: input.beatId,
    characters: [],
  }
  const canon = await defaultBeatDraftDeps.assembleCanon(ctx)
  const beat = canon.beats.find(candidate => candidate.id === input.beatId)
  if (!beat) {
    return {
      runId: '',
      status: BeatDraftWorkflowStatus.Failed,
      message: StartSectionDraftError.MissingBeat,
    }
  }

  const involved = beat.charactersInvolved ?? []
  const fingerprints = fingerprintsFromCharacterVoices(input.characterVoices ?? [])
  const brief = packManuscriptSectionBrief({
    mode: input.mode,
    scope: input.scope,
    beat: {
      sequence: beat.sequence,
      logline: beat.id,
      content: beat.content,
    },
    episodePremise: input.episodePremise ?? '',
    authorCanon: formatCanonFor(CanonAudience.Author, canon, involved),
    spanText: input.spanText,
    charactersInvolved: involved,
    fingerprints,
  })

  const workflow = getMastraInstance().getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
  if (!workflow) {
    return {
      runId: '',
      status: BeatDraftWorkflowStatus.Failed,
      message: `${BeatDraftWorkflowFailurePrefix.NotRegistered} ${BEAT_DRAFT_WORKFLOW_ID} is not registered`,
    }
  }

  try {
    const run = await workflow.createRun({ resourceId: input.projectId })
    const result = await run.start({
      inputData: {
        projectId: input.projectId,
        episodeId: input.episodeId,
        brief,
        characters: involved,
        autoApprove: false,
      },
    })

    if (result.status === BeatDraftWorkflowStatus.Suspended) {
      const fields = suspendFields(result.steps)
      return {
        runId: run.runId,
        status: BeatDraftWorkflowStatus.Suspended,
        message: fields.message,
        draft: fields.draft,
        critiques: fields.critiques,
      }
    }

    if (result.status === BeatDraftWorkflowStatus.Success) {
      const output = beatDraftOutputSchema.parse(result.result)
      return {
        runId: run.runId,
        status: BeatDraftWorkflowStatus.Completed,
        message: output.killed
          ? RUN_BEAT_DRAFT_KILLED_MESSAGE
          : `Beat drafted, critiqued, revised${output.saved ? RUN_BEAT_DRAFT_SAVED_SUFFIX : ''}.`,
      }
    }

    return {
      runId: run.runId,
      status: BeatDraftWorkflowStatus.Failed,
      message: `${BeatDraftWorkflowFailurePrefix.EndedWithStatus} ${result.status}`,
    }
  } catch (error: unknown) {
    return {
      runId: '',
      status: BeatDraftWorkflowStatus.Failed,
      message: `${BeatDraftWorkflowFailurePrefix.ExecuteFailed} ${getErrorMessage(error)}`,
    }
  }
}
