import { NextRequest, NextResponse } from 'next/server'
import { runStorytellerWorkflow } from '@/domains/storyteller/workflows/storyteller-workflow'
import { normalizeMastraTraceId } from '@/domains/storyteller/utils/workflow-context'
import { db } from '@/lib/db'
import { beats } from '@/domains/storyteller/db/schema'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'

// Persist approved beats to database
async function persistApprovedBeats(beatBoard: any[], episodeId: string) {
  const approvedBeats = beatBoard.filter((b: any) => b.status === 'approved')

  for (const beat of approvedBeats) {
    try {
      await db
        .insert(beats)
        .values({
          episodeId,
          logline: beat.logline,
          beatType: beat.beatType,
          sequence: beat.sequence,
          content: beat.content || '',
          visualHook: beat.visualHook,
          charactersInvolved: beat.charactersInvolved,
          emotionalShifts: beat.emotionalShifts,
          causalDependencies: beat.causalDependencies,
          setupsPayoffs: beat.setupsPayoffs,
          status: 'approved',
        })
        .onConflictDoNothing()
    } catch (e) {
      console.error('Failed to persist beat:', e)
    }
  }
}

export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const body = await req.json()
    const {
      message,
      projectId,
      episodeId,
      seriesBible,
      characters,
      existingBeats,
      targetEmotion,
      traceId: bodyTraceId,
    } = body

    // Extract traceId from headers or body, or generate new
    const traceId = normalizeMastraTraceId(req.headers.get('x-trace-id') || bodyTraceId)

    // Map inputs to StorytellerWorkflowInput
    const input = {
      episodeId,
      seriesBible: seriesBible || {},
      characters: characters || [],
      existingBeats: existingBeats || [],
      storyContext: message, // Use user message as context/instruction
      targetEmotion,
    }

    // Run workflow
    const result = await runStorytellerWorkflow(input, {
      modelName: 'openai:gpt-4o', // Default or from config
      traceId,
    })

    // Persist if successful
    if (result.status === 'completed' && episodeId) {
      await persistApprovedBeats(result.beats, episodeId)
    }

    // Map output to legacy format expected by UI
    // UI expects: messages, beatBoard, etc.
    // Workflow returns: beats, steps, status, message

    const aiMessage = {
      type: 'ai',
      content: result.message,
      name: 'Storyteller',
      sender: 'Storyteller',
    }

    // If beats were generated, add them to content display
    if (result.beats.length > 0) {
      const beatText = result.beats.map((b: any) => `**${b.logline}**\n${b.content}`).join('\n\n')
      aiMessage.content += `\n\nGenerated Content:\n${beatText}`
    }

    return NextResponse.json({
      messages: [aiMessage],
      beatBoard: result.beats,
      status: result.status,
      continuityIssues: result.continuityIssues,
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
