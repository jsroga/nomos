import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createGameLoopWorkflow,
  GameLoopWorkflow,
} from '@/domains/game-design/agents/game-loop-workflow'
import { requireAuth, checkRateLimit } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { getErrorMessage } from '@/shared/errors/error-utils'

// Request schemas
const CreateLoopRequestSchema = z.object({
  projectId: z.string().uuid(),
  genre: z.string().min(1),
  loopType: z.enum(['core', 'meta', 'social', 'monetization']).default('core'),
  targetAudience: z.enum(['casual', 'midcore', 'hardcore']).default('midcore'),
  theme: z.string().optional(),
  referenceGames: z.array(z.string()).optional(),
})

const ResumeWorkflowRequestSchema = z.object({
  runId: z.string(),
  approved: z.boolean(),
  feedback: z.string().optional(),
  modifications: z.any().optional(),
})

// Cache for workflow instance (singleton per process)
let workflowInstance: GameLoopWorkflow | null = null

async function getWorkflow(): Promise<GameLoopWorkflow> {
  if (!workflowInstance) {
    workflowInstance = await createGameLoopWorkflow({
      modelName: process.env.GAME_DESIGN_MODEL || 'openai:gpt-4o',
      connectionString: process.env.DATABASE_URL,
    })
  }
  return workflowInstance
}

/**
 * POST /api/workflows/game-design
 * Start a new game loop design workflow
 */
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit: 5 workflow starts per minute
    const { allowed } = checkRateLimit(`game-design-workflow:${session.user.id}`, {
      maxRequests: 5,
      windowMs: 60000,
    })
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before starting another workflow.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const parseResult = CreateLoopRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.format() },
        { status: 400 }
      )
    }

    const { projectId, genre, loopType, targetAudience, theme, referenceGames } = parseResult.data

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get workflow instance
    const workflow = await getWorkflow()

    // Start the workflow
    const result = await workflow.run({
      projectId,
      genre,
      loopType,
      targetAudience,
      theme,
      referenceGames,
    })

    console.log(`[Game Design Workflow] Started for project ${projectId}, genre: ${genre}`)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: unknown) {
    console.error('[Game Design Workflow] Error:', error)
    return NextResponse.json(
      { error: 'Failed to start workflow', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/workflows/game-design
 * Resume a suspended workflow with user feedback
 */
export async function PUT(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parseResult = ResumeWorkflowRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.format() },
        { status: 400 }
      )
    }

    const { runId, approved, feedback, modifications } = parseResult.data

    // Get workflow instance
    const workflow = await getWorkflow()

    // Resume the workflow
    const result = await workflow.resumeWithFeedback(runId, {
      approved,
      feedback,
      modifications,
    })

    console.log(`[Game Design Workflow] Resumed run ${runId}, approved: ${approved}`)

    return NextResponse.json({
      success: true,
      result,
    })
  } catch (error: unknown) {
    console.error('[Game Design Workflow] Resume error:', error)
    return NextResponse.json(
      { error: 'Failed to resume workflow', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * GET /api/workflows/game-design?runId=xxx
 * Get the status of a workflow run
 */
export async function GET(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get('runId')

    if (!runId) {
      return NextResponse.json({ error: 'runId is required' }, { status: 400 })
    }

    // Get workflow instance
    const workflow = await getWorkflow()

    // Get run status (would need to implement getRunStatus on workflow)
    // For now, return a placeholder
    return NextResponse.json({
      runId,
      status: 'unknown',
      message: 'Run status retrieval not yet implemented',
    })
  } catch (error: unknown) {
    console.error('[Game Design Workflow] Status error:', error)
    return NextResponse.json(
      { error: 'Failed to get workflow status', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
