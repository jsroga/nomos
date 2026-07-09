/**
 * run_beat_draft_workflow — the single workflow entry tool (tool #10).
 *
 * Starts the beat-draft pipeline (plan → draft → critics → verdict → revise)
 * and returns at the FIRST suspend: the chat layer surfaces the verdict via
 * the existing `questions` / `awaiting_input` SSE frames, and the human
 * resumes through POST /api/storyteller/workflow/resume. The tool never
 * awaits the resume — a suspended run is a success result, not a hang.
 *
 * With `autoApprove: true` the verdict gate is skipped and the tool returns
 * the completed pipeline output (batch/eval mode).
 *
 * Exposed to the CHAT adapter only — never to the GRRM author (the author
 * runs inside this workflow; giving it the entry tool would allow recursion).
 * The Mastra instance is resolved via dynamic import to keep this module
 * statically cycle-free (tool ← tools barrel ← workflow ← io runtime ←
 * MastraInstance).
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import {
  BEAT_DRAFT_WORKFLOW_ID,
  RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  VERDICT_STEP_ID,
  beatDraftOutputSchema,
} from '@/domains/storyteller/agents/workflows/beat-draft-contract'
import {
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  requestContextString,
} from '@/domains/storyteller/agents/request-context'
import { getErrorMessage } from '@/shared/errors/error-utils'

const RunBeatDraftInputSchema = z.object({
  // Server-trusted RequestContext IDs win over these — they exist only so
  // Studio (no request context) stays usable.
  projectId: z
    .string()
    .min(1)
    .optional()
    .describe('Project ID — normally supplied by the authenticated request context'),
  episodeId: z
    .string()
    .min(1)
    .optional()
    .describe('Episode ID — normally supplied by the authenticated request context'),
  brief: z
    .string()
    .min(1)
    .describe('What this beat must accomplish: goal, POV, plants/payoffs, constraints'),
  characters: z
    .array(z.string())
    .optional()
    .describe('Character names available for this beat'),
  autoApprove: z
    .boolean()
    .optional()
    .describe('Skip the human verdict gate (batch mode). Default false.'),
})

const RunBeatDraftOutputSchema = z.object({
  runId: z.string(),
  status: z.enum(['suspended', 'completed', 'failed']),
  /** Present when status = suspended — what the human must judge. */
  draft: z.string().optional(),
  critiques: z.string().optional(),
  /** Present when status = completed. */
  output: beatDraftOutputSchema.optional(),
  message: z.string(),
})

interface SuspendedVerdictPayload {
  reason?: string
  draft?: string
  critiques?: string
  planWarnings?: string[]
}

export const runBeatDraftWorkflowTool = createTool({
  id: RUN_BEAT_DRAFT_WORKFLOW_TOOL_ID,
  description:
    'Draft a story beat through the full GRRM quality pipeline: beat plan → script-format draft → three narrow critics → HUMAN VERDICT (the run pauses for approval) → revision. Use this whenever the user asks to write, draft, or generate a story beat or scene.',
  inputSchema: RunBeatDraftInputSchema,
  outputSchema: RunBeatDraftOutputSchema,
  execute: async (inputData, context) => {
    // Server-trusted IDs from the authenticated request beat model-supplied args.
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId
    if (!projectId || !episodeId) {
      return {
        runId: '',
        status: 'failed' as const,
        message:
          'projectId and episodeId are required (from the request context or tool input) to run the beat pipeline',
      }
    }

    // Dynamic import: binds the workflow to the storage-backed instance
    // without a static import cycle.
    const { getMastraInstance } = await import('@/shared/agent-kernel')
    const mastra = getMastraInstance()
    const workflow = mastra.getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
    if (!workflow) {
      return {
        runId: '',
        status: 'failed' as const,
        message: `Workflow ${BEAT_DRAFT_WORKFLOW_ID} is not registered`,
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

      if (result.status === 'suspended') {
        const payload: SuspendedVerdictPayload =
          result.steps[VERDICT_STEP_ID]?.suspendPayload ?? {}
        return {
          runId: run.runId,
          status: 'suspended' as const,
          draft: payload.draft,
          critiques: payload.critiques,
          message: [
            payload.reason ??
              'Draft and critiques are ready — awaiting the editorial verdict (approve / revise / kill).',
            ...(payload.planWarnings?.length
              ? [`Plan concreteness warnings (planner failed the retry): ${payload.planWarnings.join(' | ')}`]
              : []),
          ].join('\n'),
        }
      }

      if (result.status === 'success') {
        const output = beatDraftOutputSchema.parse(result.result)
        return {
          runId: run.runId,
          status: 'completed' as const,
          output,
          message: output.killed
            ? 'Draft killed by editor — nothing saved.'
            : `Beat drafted, critiqued, revised${output.saved ? ' and saved' : ''}.`,
        }
      }

      return {
        runId: run.runId,
        status: 'failed' as const,
        message: `Workflow ended with status ${result.status}`,
      }
    } catch (error: unknown) {
      return {
        runId: '',
        status: 'failed' as const,
        message: `beat-draft-workflow failed: ${getErrorMessage(error)}`,
      }
    }
  },
})
