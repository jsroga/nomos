import { NextResponse } from 'next/server'
import { HumanMessage, BaseMessage } from '@langchain/core/messages'
import {
  getWritersRoomGraph,
  getActiveWritersRoomGraph,
} from '@/domains/storyteller/graph/writers-room'
import { createInitialState, CharacterState } from '@/domains/storyteller/graph/state'
import { db } from '@/lib/db'
import { beats } from '@/domains/storyteller/db/schema'

// Log LangSmith config on startup
const LANGSMITH_ENABLED = process.env.LANGCHAIN_TRACING_V2 === 'true'
if (LANGSMITH_ENABLED) {
  console.log(
    `LangSmith tracing enabled for project: ${process.env.LANGCHAIN_PROJECT || 'default'}`
  )
}

// Convert LangChain messages to UI format
function formatMessagesForUI(messages: BaseMessage[]) {
  return messages.map(msg => {
    const isHuman = msg._getType() === 'human'
    return {
      type: isHuman ? 'human' : 'ai',
      content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      name: msg.name || (isHuman ? 'User' : 'Unknown'),
      sender: msg.name || (isHuman ? 'User' : 'Unknown'),
    }
  })
}

// Persist approved beats to database
async function persistApprovedBeats(beatBoard: any[], episodeId: string) {
  const approvedBeats = beatBoard.filter(b => b.status === 'approved')

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

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const {
      message,
      projectId,
      episodeId,
      threadId,
      seriesBible,
      characters,
      existingBeats,
      currentPhase,
      userEmail, // For Bible lock permission checks
    } = body

    // Map characters to CharacterState format
    const characterStates: CharacterState[] = (characters || []).map((c: any) => ({
      characterId: c.id,
      name: c.name,
      currentGoals: c.psychology?.goals || [],
      fears: c.psychology?.fears || [],
      selfDelusion: c.psychology?.selfDelusion || '',
      actualMotivation: c.psychology?.actualMotivation || '',
      transformationProgress: c.arcStatus?.transformation || 0,
      knowledgeState: {},
      stressLevel: c.stressLevel || 0,
      emotionHistory: [],
    }))

    // Create initial state with user message
    const initialState = createInitialState({
      projectId: projectId || 'default',
      episodeId: episodeId,
      userEmail: userEmail, // Pass user email for permission checks
      currentPhase: currentPhase || 'breaking',
      seriesBible: seriesBible || {},
      characters: characterStates,
      beatBoard: existingBeats || [],
      messages: [
        new HumanMessage({
          content: message,
          name: 'User',
        }),
      ],
    })

    // Invoke the LangGraph workflow with recursion limit and tracing
    const config = {
      configurable: {
        thread_id: threadId || 'default',
      },
      recursionLimit: 15, // Prevent infinite loops
      // LangSmith tracing metadata
      runName: `writers-room-${currentPhase || 'breaking'}`,
      tags: [
        'storyteller',
        `phase:${currentPhase || 'breaking'}`,
        `project:${projectId || 'default'}`,
      ],
      metadata: {
        projectId: projectId || 'default',
        episodeId: episodeId || 'none',
        phase: currentPhase || 'breaking',
      },
    }

    console.log('Invoking writers room graph with LangSmith tracing...')
    const graph = await getActiveWritersRoomGraph()
    const result = await graph.invoke(initialState, config)
    console.log('Graph invocation complete')

    // Persist approved beats
    if (episodeId && result.beatBoard?.length > 0) {
      await persistApprovedBeats(result.beatBoard, episodeId)
    }

    // Format messages for UI
    const formattedMessages = formatMessagesForUI(result.messages || [])

    return NextResponse.json({
      messages: formattedMessages,
      currentPhase: result.currentPhase,
      phaseIterations: result.phaseIterations,
      beatBoard: result.beatBoard,
      script: result.script,
      awaitingUserInput: result.awaitingUserInput,
    })
  } catch (error) {
    console.error('Error in chat:', error)

    // Return a meaningful error response
    return NextResponse.json(
      {
        messages: [
          {
            type: 'ai',
            content: `Writers room encountered an issue: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your API keys in settings.`,
            name: 'System',
            sender: 'System',
          },
        ],
        error: error instanceof Error ? error.message : 'Failed to process message',
      },
      { status: 200 }
    )
  }
}
