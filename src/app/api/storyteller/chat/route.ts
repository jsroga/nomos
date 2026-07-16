import { NextRequest, NextResponse } from 'next/server'
import { normalizeMastraTraceId } from '@/domains/storyteller/ai/tracing'
// Value import from io/mastra-runtime also registers the storyteller agents +
// workflow on the kernel runtime registry before getMastraInstance() runs.
import { BEAT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/core/io/mastra-runtime'
import { beatDraftOutputSchema } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import { isKnownChatModel, resolveChatModelId } from '@/domains/storyteller/config/constants/chat-model-catalog'
import {
  ChatContinuitySeverity,
  ChatPipelineRunStatus,
  ChatResponseStatus,
  ChatSenderName,
} from '@/domains/storyteller/core/io/constants/chat-route'
import {
  StorytellerMessageRole,
  StorytellerMessageType,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { getMastraInstance } from '@/shared/agent-kernel'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpHeader } from '@/shared/data/constants/protocol'

/**
 * Non-streaming chat endpoint.
 *
 * Response contract preserved from the legacy StorytellerWorkflow:
 * `{ messages, beatBoard, status, continuityIssues, traceId }`.
 * Internally it now runs the beat-draft pipeline with `autoApprove: true`
 * (no verdict UI on this endpoint — the revised beat persists directly).
 */
export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest): Promise<NextResponse> => {
  try {
    const body = await req.json()
    const {
      message,
      projectId,
      episodeId,
      characters,
      traceId: bodyTraceId,
      modelName,
    } = body

    // Resolve chat model id (fall back to global default; reject unknown).
    const resolvedModelName = resolveChatModelId(modelName)
    if (!isKnownChatModel(resolvedModelName)) {
      return NextResponse.json(
        { error: `Unknown model: ${resolvedModelName}` },
        { status: 400 }
      )
    }

    if (!projectId || !episodeId || !message) {
      return NextResponse.json(
        { error: API_ERROR.CHAT_FIELDS_REQUIRED },
        { status: 400 }
      )
    }

    // Extract traceId from headers or body, or generate new
    const traceId = normalizeMastraTraceId(req.headers.get(HttpHeader.TRACE_ID) || bodyTraceId)

    const workflow = getMastraInstance().getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
    if (!workflow) {
      return NextResponse.json({ error: API_ERROR.BEAT_PIPELINE_NOT_REGISTERED }, { status: 500 })
    }

    const run = await workflow.createRun()
    const result = await run.start({
      inputData: {
        projectId,
        episodeId,
        brief: message,
        characters: Array.isArray(characters) ? characters : [],
        autoApprove: true,
      },
    })

    if (result.status !== ChatPipelineRunStatus.Success) {
      return NextResponse.json(
        {
          messages: [
            {
              type: StorytellerMessageType.Ai,
              content: `Storyteller pipeline ended with status: ${result.status}`,
              name: StorytellerMessageRole.System,
              sender: StorytellerMessageRole.System,
            },
          ],
          beatBoard: [],
          status: ChatResponseStatus.Failed,
          continuityIssues: [],
          traceId,
        },
        { status: 500 }
      )
    }

    const output = beatDraftOutputSchema.parse(result.result)

    const aiMessage = {
      type: StorytellerMessageType.Ai,
      content: output.killed
        ? output.message
        : `${output.message}\n\nGenerated Content:\n${output.finalDraft}`,
      name: ChatSenderName.Storyteller,
      sender: ChatSenderName.Storyteller,
    }

    return NextResponse.json({
      messages: [aiMessage],
      beatBoard: output.beatId
        ? [{ id: output.beatId, logline: output.beatPlan?.goal ?? '', content: output.finalDraft }]
        : [],
      status: output.saved ? ChatResponseStatus.Completed : ChatResponseStatus.NeedsReview,
      // The critics' formatted findings ride along where the legacy
      // continuity issues appeared.
      continuityIssues: output.critiques
        ? [{ severity: ChatContinuitySeverity.Info, message: output.critiques }]
        : [],
      traceId,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.CHAT_ERROR, error)
    return NextResponse.json(
      {
        messages: [
          {
            type: StorytellerMessageType.Ai,
            content: `Storyteller encountered an issue: ${error instanceof Error ? error.message : API_ERROR.UNKNOWN_ERROR}`,
            name: StorytellerMessageRole.System,
            sender: StorytellerMessageRole.System,
          },
        ],
        error: error instanceof Error ? error.message : API_ERROR.FAILED_PROCESS_MESSAGE,
      },
      { status: 500 }
    )
  }
})
