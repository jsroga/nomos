import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  createGameLoopWorkflow,
  GameLoopWorkflow,
} from '@/domains/game-design/agents/game-loop-workflow'
import { requireAuth, checkRateLimit } from '@/shared/data/api-utils'
import { verifyProjectAccess } from '@/domains/storyteller/server'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { QueryParam, TriggerRunStatus } from '@/shared/data/constants/protocol'

enum GameLoopType {
  Core = 'core',
  Meta = 'meta',
  Social = 'social',
  Monetization = 'monetization',
}

enum TargetAudience {
  Casual = 'casual',
  Midcore = 'midcore',
  Hardcore = 'hardcore',
}

const GAME_DESIGN_DEFAULT_MODEL = 'openai:gpt-4o'

// Request schemas
const CreateLoopRequestSchema = z.object({
  projectId: z.string().uuid(),
  genre: z.string().min(1),
  loopType: z
    .enum([
      GameLoopType.Core,
      GameLoopType.Meta,
      GameLoopType.Social,
      GameLoopType.Monetization,
    ])
    .default(GameLoopType.Core),
  targetAudience: z
    .enum([TargetAudience.Casual, TargetAudience.Midcore, TargetAudience.Hardcore])
    .default(TargetAudience.Midcore),
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

async function getWorkflow(): Promise<{ workflow: GameLoopWorkflow }> {
  if (!workflowInstance) {
    const created = await createGameLoopWorkflow({
      modelName: process.env.GAME_DESIGN_MODEL || GAME_DESIGN_DEFAULT_MODEL,
      connectionString: process.env.DATABASE_URL,
    })
    workflowInstance = created.workflow
  }
  return { workflow: workflowInstance }
}

/**
 * POST /api/workflows/game-design
 * Start a new game loop design workflow
 */
export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    // Rate limit: 5 workflow starts per minute
    const { allowed } = checkRateLimit(`game-design-workflow:${session.user.id}`, {
      maxRequests: 5,
      windowMs: 60000,
    })
    if (!allowed) {
      return NextResponse.json({ error: API_ERROR.WORKFLOW_RATE_LIMIT }, { status: 429 })
    }

    const body = await req.json()
    const parseResult = CreateLoopRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: API_ERROR.INVALID_REQUEST_SHORT, details: parseResult.error.format() },
        { status: 400 }
      )
    }

    const { projectId, genre, loopType, targetAudience, theme, referenceGames } = parseResult.data

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 403 })
    }

    // Get workflow instance
    const { workflow } = await getWorkflow()

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
    console.error(API_LOG_PREFIX.GAME_DESIGN_WORKFLOW_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_START_WORKFLOW, details: getErrorMessage(error) },
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
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const body = await req.json()
    const parseResult = ResumeWorkflowRequestSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: API_ERROR.INVALID_REQUEST_SHORT, details: parseResult.error.format() },
        { status: 400 }
      )
    }

    const { runId, approved, feedback, modifications } = parseResult.data

    // Get workflow instance
    const { workflow } = await getWorkflow()

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
    console.error(API_LOG_PREFIX.GAME_DESIGN_WORKFLOW_RESUME_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_RESUME_WORKFLOW, details: getErrorMessage(error) },
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
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const runId = searchParams.get(QueryParam.RunId)

    if (!runId) {
      return NextResponse.json({ error: API_ERROR.RUN_ID_REQUIRED }, { status: 400 })
    }

    // Get workflow instance
    await getWorkflow()

    // Get run status (would need to implement getRunStatus on workflow)
    // For now, return a placeholder
    return NextResponse.json({
      runId,
      status: TriggerRunStatus.Unknown,
      message: API_ERROR.WORKFLOW_STATUS_NOT_IMPLEMENTED,
    })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.GAME_DESIGN_WORKFLOW_STATUS_ERROR, error)
    return NextResponse.json(
      { error: API_ERROR.FAILED_GET_WORKFLOW_STATUS, details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}
