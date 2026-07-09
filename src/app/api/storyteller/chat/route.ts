import { NextRequest, NextResponse } from 'next/server'
import { normalizeMastraTraceId } from '@/domains/storyteller/agents/tracing'
// Value import from io/mastra-runtime also registers the storyteller agents +
// workflow on the kernel runtime registry before getMastraInstance() runs.
import { BEAT_DRAFT_WORKFLOW_ID } from '@/domains/storyteller/io/mastra-runtime'
import { beatDraftOutputSchema } from '@/domains/storyteller/agents/workflows/beat-draft-contract'
import { isKnownChatModel, resolveChatModelId } from '@/domains/storyteller/config/ChatModelCatalog'
import { getMastraInstance } from '@/shared/agent-kernel'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'

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
        { error: 'projectId, episodeId and message are required' },
        { status: 400 }
      )
    }

    // Extract traceId from headers or body, or generate new
    const traceId = normalizeMastraTraceId(req.headers.get('x-trace-id') || bodyTraceId)

    const workflow = getMastraInstance().getWorkflow(BEAT_DRAFT_WORKFLOW_ID)
    if (!workflow) {
      return NextResponse.json({ error: 'Beat pipeline not registered' }, { status: 500 })
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

    if (result.status !== 'success') {
      return NextResponse.json(
        {
          messages: [
            {
              type: 'ai',
              content: `Storyteller pipeline ended with status: ${result.status}`,
              name: 'System',
              sender: 'System',
            },
          ],
          beatBoard: [],
          status: 'failed',
          continuityIssues: [],
          traceId,
        },
        { status: 500 }
      )
    }

    const output = beatDraftOutputSchema.parse(result.result)

    const aiMessage = {
      type: 'ai',
      content: output.killed
        ? output.message
        : `${output.message}\n\nGenerated Content:\n${output.finalDraft}`,
      name: 'Storyteller',
      sender: 'Storyteller',
    }

    return NextResponse.json({
      messages: [aiMessage],
      beatBoard: output.beatId
        ? [{ id: output.beatId, logline: output.beatPlan?.goal ?? '', content: output.finalDraft }]
        : [],
      status: output.saved ? 'completed' : 'needs_review',
      // The critics' formatted findings ride along where the legacy
      // continuity issues appeared.
      continuityIssues: output.critiques ? [{ severity: 'info', message: output.critiques }] : [],
      traceId,
    })
  } catch (error) {
    console.error('Error in chat:', error)
    return NextResponse.json(
      {
        messages: [
          {
            type: 'ai',
            content: `Storyteller encountered an issue: ${error instanceof Error ? error.message : 'Unknown error'}`,
            name: 'System',
            sender: 'System',
          },
        ],
        error: error instanceof Error ? error.message : 'Failed to process message',
      },
      { status: 500 }
    )
  }
})
