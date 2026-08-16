import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { POLLING_INTERVALS } from '@/shared/data/constants/polling'
import { browserStorage } from '@/shared/data/browser-storage'
import { waitForTriggerRun, TriggerRunPollFailedError } from '@/shared/data/polling/wait-for-trigger-run'
import {
  readString,
  readNumber,
  recordFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import { getStorytellerUiStore } from '@/domains/storyteller/state/useStorytellerUiStore'
import {
  fetchMoodboardRunStatus,
  triggerMoodboardGeneration,
} from '@/domains/storyteller/core/io/moodboard.api'
import {
  MoodboardGenerationError,
  MoodboardGenerationLog,
  MoodboardOperationDetail,
  MoodboardOperationLabel,
  MoodboardOperationStatus,
  MoodboardOperationType,
  MoodboardStorageKey,
  MoodboardTriggerStatus,
} from '@/domains/storyteller/services/constants/moodboard-generation-service'

const MOODBOARD_UNKNOWN_STATUS = 'unknown'
const MOODBOARD_METADATA_KEY = 'metadata'

const DynamicLocalStorageKeys = {
  moodboardGen: (projectId: string, index?: number) =>
    `${MoodboardStorageKey.GenPrefix}${projectId}${index !== undefined ? `-${index}` : ''}`,
}

interface MoodboardGenRunState {
  runId: string
  projectId: string
  prompts: string[]
  startedAt: string
  promptIndex?: number
}

/** Parse a persisted run-state blob from browser storage without `as` casts. */
function moodboardRunStateFromJson(raw: string): MoodboardGenRunState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  const rec = recordFromJson(parsed)
  const runId = readString(rec.runId)
  if (!runId) return null
  return {
    runId,
    projectId: readString(rec.projectId) ?? '',
    prompts: stringArrayFromJson(rec.prompts),
    startedAt: readString(rec.startedAt) ?? '',
    promptIndex: readNumber(rec.promptIndex),
  }
}

function formatMoodboardStatusDetail(
  status: string | null | undefined,
  metadata?: Record<string, unknown>
): string {
  let statusDetail = `Status: ${status ?? MOODBOARD_UNKNOWN_STATUS}`
  const progressVal = typeof metadata?.progress === 'number' ? metadata.progress : 0
  const stage = readString(metadata?.stage)
  if (stage) {
    const formattedStage = stage
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
    statusDetail = `${formattedStage} (${progressVal}%)`
  } else {
    statusDetail = `${statusDetail} (${progressVal}%)`
  }
  return statusDetail
}

export class MoodboardGenerationService {
  /**
   * Generate moodboard using Trigger.dev background task
   */
  async generate(
    projectId: string,
    prompts: string[],
    styleReference: string | undefined,
    providerConfig: Record<string, unknown>,
    onComplete?: () => void,
    promptIndex?: number,
    onError?: (error: unknown) => void,
  ): Promise<string | null> {
    console.log(`Starting moodboard generation via Trigger.dev for project ${projectId}`)

    const opId = DynamicLocalStorageKeys.moodboardGen(projectId, promptIndex)

    useGlobalStatusStore.getState().addOperation({
      id: opId,
      type: MoodboardOperationType.StoryAgent,
      label:
        promptIndex !== undefined
          ? MoodboardOperationLabel.Regenerating
          : MoodboardOperationLabel.Generating,
      details: MoodboardOperationDetail.Initializing,
      status: MoodboardOperationStatus.InProgress,
    })

    try {
      const { handleId, error } = await triggerMoodboardGeneration({
        projectId,
        prompts,
        styleReference,
        providerConfig,
        promptIndex,
      })

      if (!handleId) {
        throw new Error(error || MoodboardGenerationError.TriggerFailed)
      }

      console.log(MoodboardGenerationLog.TaskTriggered, handleId)

      const runState: MoodboardGenRunState = {
        runId: handleId,
        projectId,
        prompts,
        startedAt: new Date().toISOString(),
        promptIndex,
      }

      browserStorage.setObject(opId, runState)
      void this.pollRun(runState, opId, onComplete, onError)

      return handleId
    } catch (error) {
      console.error(MoodboardGenerationLog.GenerationError, error)
      useGlobalStatusStore.getState().removeOperation(opId)
      throw error
    }
  }

  private async pollRun(
    runState: MoodboardGenRunState,
    opId: string,
    onComplete?: () => void,
    onError?: (error: unknown) => void,
  ): Promise<void> {
    console.log(`📡 Starting moodboard status polling for run: ${runState.runId}`)

    try {
      const result = await waitForTriggerRun(() => fetchMoodboardRunStatus(runState.runId), {
        intervalMs: POLLING_INTERVALS.DEFAULT,
        maxPolls: 120,
        onPoll: data => {
          const metadata =
            MOODBOARD_METADATA_KEY in data && data.metadata && typeof data.metadata === 'object'
              ? recordFromJson(data.metadata)
              : undefined
          useGlobalStatusStore.getState().updateOperation(opId, {
            details: formatMoodboardStatusDetail(data.status, metadata),
          })
        },
      })

      if (result.status === MoodboardTriggerStatus.Completed) {
        const output = recordFromJson(result.output)
        if (output.success === true) {
          await this.handleCompletion(
            runState,
            { success: true, images: stringArrayFromJson(output.images) },
            opId,
            onComplete,
          )
          return
        }
      }

      console.error(MoodboardGenerationLog.Failed, result.error || result.status)
      this.clearRunState(runState, opId)
      onError?.(result.error ?? new Error(MoodboardGenerationError.GenerationFailed))
    } catch (error) {
      if (error instanceof TriggerRunPollFailedError) {
        console.error(MoodboardGenerationLog.Failed, error.runError || error.status)
      } else {
        console.error(MoodboardGenerationLog.PollingError, error)
      }
      this.clearRunState(runState, opId)
      onError?.(error)
    }
  }

  private async handleCompletion(
    runState: MoodboardGenRunState,
    output: { success: boolean; images: string[] },
    opId: string,
    onComplete?: () => void
  ) {
    try {
      if (output.success) {
        console.log(MoodboardGenerationLog.GeneratedSuccessfully)

        if (typeof window !== 'undefined') {
          getStorytellerUiStore().notifyMoodboardComplete({
            projectId: runState.projectId,
            promptIndex: runState.promptIndex,
            images: output.images,
          })
        }

        onComplete?.()
      }
    } catch (error) {
      console.error(MoodboardGenerationLog.CompletionError, error)
    } finally {
      this.clearRunState(runState, opId)
    }
  }

  private clearRunState(_runState: MoodboardGenRunState, opId: string) {
    browserStorage.remove(opId)
    useGlobalStatusStore.getState().removeOperation(opId)
  }

  resumePendingGenerations(
    projectId: string,
    onComplete?: () => void,
    onError?: (error: unknown) => void,
  ) {
    if (typeof window === 'undefined') return

    const prefix = MoodboardStorageKey.GenPrefix + projectId

    browserStorage.forEachPrefixed(prefix, (key, raw) => {
      try {
        const runState = moodboardRunStateFromJson(raw)
        if (!runState?.runId) return

        console.log(MoodboardGenerationLog.ResumingPolling, runState.runId)

        useGlobalStatusStore.getState().addOperation({
          id: key,
          type: MoodboardOperationType.StoryAgent,
          label:
            runState.promptIndex !== undefined
              ? MoodboardOperationLabel.RegeneratingResumed
              : MoodboardOperationLabel.GeneratingResumed,
          details: `${MoodboardOperationDetail.ProjectPrefix}${projectId}`,
          status: MoodboardOperationStatus.InProgress,
        })

        void this.pollRun(runState, key, onComplete, onError)
      } catch {
        console.warn(MoodboardGenerationLog.ParseStateFailed, key)
      }
    })
  }
}

export const moodboardGenerationService = new MoodboardGenerationService()
