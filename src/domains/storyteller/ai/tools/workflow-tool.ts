/**
 * run_beat_draft_workflow — the single workflow entry tool (tool #10).
 */

import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  VERDICT_STEP_ID,
  beatDraftOutputSchema,
} from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import {
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import {
  BeatDraftWorkflowFailurePrefix,
  BeatDraftWorkflowStatus,
  RUN_BEAT_DRAFT_AUTO_APPROVE_DESC,
  RUN_BEAT_DRAFT_CHARACTERS_DESC,
  RUN_BEAT_DRAFT_EPISODE_ID_DESC,
  RUN_BEAT_DRAFT_KILLED_MESSAGE,
  RUN_BEAT_DRAFT_MISSING_IDS_MESSAGE,
  RUN_BEAT_DRAFT_PLAN_WARNING_PREFIX,
  RUN_BEAT_DRAFT_PLAN_WARNING_SEPARATOR,
  RUN_BEAT_DRAFT_PROJECT_ID_DESC,
  RUN_BEAT_DRAFT_SAVED_SUFFIX,
  RUN_BEAT_DRAFT_TOOL_DESCRIPTION,
  RUN_BEAT_DRAFT_VERDICT_DEFAULT_REASON,
} from '@/domains/storyteller/ai/constants/workflow-tool'
import { getErrorMessage } from '@/shared/errors/error-utils'

const RunBeatDraftInputSchema = z.object({
  projectId: z.string().min(1).optional().describe(RUN_BEAT_DRAFT_PROJECT_ID_DESC),
  episodeId: z.string().min(1).optional().describe(RUN_BEAT_DRAFT_EPISODE_ID_DESC),
  brief: z
    .string()
    .min(1)
    .describe('What this beat must accomplish: goal, POV, plants/payoffs, constraints'),
  characters: z.array(z.string()).optional().describe(RUN_BEAT_DRAFT_CHARACTERS_DESC),
  autoApprove: z.boolean().optional().describe(RUN_BEAT_DRAFT_AUTO_APPROVE_DESC),
})

const RunBeatDraftOutputSchema = z.object({
  runId: z.string(),
  status: z.enum([
    BeatDraftWorkflowStatus.Suspended,
    BeatDraftWorkflowStatus.Completed,
    BeatDraftWorkflowStatus.Failed,
  ]),
  draft: z.string().optional(),
  critiques: z.string().optional(),
  output: beatDraftOutputSchema.optional(),
  message: z.string(),
})

interface SuspendedVerdictPayload {
  reason?: string
  draft?: string
  critiques?: string
  planWarnings?: string[]
}

type RunBeatDraftOutput = z.infer<typeof RunBeatDraftOutputSchema>

export const runBeatDraftWorkflowTool = createTool({
  id: RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  description: RUN_BEAT_DRAFT_TOOL_DESCRIPTION,
  inputSchema: RunBeatDraftInputSchema,
  outputSchema: RunBeatDraftOutputSchema,
  execute: async (inputData, context): Promise<RunBeatDraftOutput> => {
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId
    if (!projectId || !episodeId) {
      return {
        runId: '',
        status: BeatDraftWorkflowStatus.Failed,
        message: RUN_BEAT_DRAFT_MISSING_IDS_MESSAGE,
      }
    }

    const { getMastraInstance } = await import('@/shared/agent-kernel')
    const mastra = getMastraInstance()
    const workflow = mastra.getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
    if (!workflow) {
      return {
        runId: '',
        status: BeatDraftWorkflowStatus.Failed,
        message: `${BeatDraftWorkflowFailurePrefix.NotRegistered} ${BEAT_DRAFT_WORKFLOW_ID} is not registered`,
      }
    }

    try {
      const run = await workflow.createRun()
      const result = await run.start({
        inputData: {
          projectId,
          episodeId,
          brief: inputData.brief,
          characters: inputData.characters ?? [],
          autoApprove: inputData.autoApprove ?? false,
        },
      })

      if (result.status === BeatDraftWorkflowStatus.Suspended) {
        const payload: SuspendedVerdictPayload =
          result.steps[VERDICT_STEP_ID]?.suspendPayload ?? {}
        return {
          runId: run.runId,
          status: BeatDraftWorkflowStatus.Suspended,
          draft: payload.draft,
          critiques: payload.critiques,
          message: [
            payload.reason ?? RUN_BEAT_DRAFT_VERDICT_DEFAULT_REASON,
            ...(payload.planWarnings?.length
              ? [
                  `${RUN_BEAT_DRAFT_PLAN_WARNING_PREFIX}${payload.planWarnings.join(RUN_BEAT_DRAFT_PLAN_WARNING_SEPARATOR)}`,
                ]
              : []),
          ].join('\n'),
        }
      }

      if (result.status === BeatDraftWorkflowStatus.Success) {
        const output = beatDraftOutputSchema.parse(result.result)
        return {
          runId: run.runId,
          status: BeatDraftWorkflowStatus.Completed,
          output,
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
  },
})
