import { resolveChatModelId } from '@/domains/storyteller/config/resolve-chat-model'
import { NextRequest, NextResponse } from 'next/server'
import { normalizeMastraTraceId } from '@/domains/storyteller/ai/tracing'
import { BEAT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/core/io/mastra-runtime'
import { beatDraftOutputSchema } from '@/domains/storyteller/ai/workflows/beat-draft-contract'
import { isKnownChatModel } from '@/domains/storyteller/config/constants/chat-model-catalog'
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
import { tryProjectScope } from '@/shared/auth/project-scope'
import { HttpStatus } from '@/shared/data/constants/protocol'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpHeader } from '@/shared/data/constants/protocol'

interface ChatRequestBody {
  message?: string
  projectId?: string
  episodeId?: string
  characters?: unknown
  traceId?: string
  modelName?: string
}

function buildFailedPipelineResponse(traceId: string, status: string) {
  return NextResponse.json(
    {
      messages: [
        {
          type: StorytellerMessageType.Ai,
          content: `Storyteller pipeline ended with status: ${status}`,
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

function buildSuccessResponse(
  output: ReturnType<typeof beatDraftOutputSchema.parse>,
  traceId: string
) {
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
    continuityIssues: output.critiques
      ? [{ severity: ChatContinuitySeverity.Info, message: output.critiques }]
      : [],
    traceId,
  })
}

function buildChatErrorResponse(error: unknown) {
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

export async function handleStorytellerChatPost(
  req: NextRequest,
  userId: string
): Promise<NextResponse> {
  try {
    const body: ChatRequestBody = await req.json()
    const { message, projectId, episodeId, characters, traceId: bodyTraceId, modelName } = body

    const resolvedModelName = resolveChatModelId(modelName)
    if (!isKnownChatModel(resolvedModelName)) {
      return NextResponse.json({ error: `Unknown model: ${resolvedModelName}` }, { status: 400 })
    }

    if (!projectId || !episodeId || !message) {
      return NextResponse.json({ error: API_ERROR.CHAT_FIELDS_REQUIRED }, { status: 400 })
    }

    // The ids come from the request body, so ownership is checked before any
    // canon is read or any model is called — this endpoint spends money.
    if (!(await tryProjectScope(projectId, userId))) {
      // 404, not 403: a 403 confirms the project exists.
      return NextResponse.json(
        { error: API_ERROR.PROJECT_NOT_FOUND },
        { status: HttpStatus.NOT_FOUND }
      )
    }

    const traceId = normalizeMastraTraceId(req.headers.get(HttpHeader.TRACE_ID) || bodyTraceId)

    const workflow = getMastraInstance().getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
    if (!workflow) {
      return NextResponse.json({ error: API_ERROR.BEAT_PIPELINE_NOT_REGISTERED }, { status: 500 })
    }

    const run = await workflow.createRun({ resourceId: projectId })
    const result = await run.start({
      inputData: {
        projectId,
        episodeId,
        brief: message,
        characters: Array.isArray(characters) ? characters : [],
        autoApprove: false,
      },
    })

    if (result.status !== ChatPipelineRunStatus.Success) {
      return buildFailedPipelineResponse(traceId, result.status)
    }

    const output = beatDraftOutputSchema.parse(result.result)
    return buildSuccessResponse(output, traceId)
  } catch (error) {
    console.error(API_LOG_PREFIX.CHAT_ERROR, error)
    return buildChatErrorResponse(error)
  }
}
