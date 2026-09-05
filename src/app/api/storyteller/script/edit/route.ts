import { NextRequest, NextResponse } from 'next/server'
import { regenerateText } from '@/domains/storyteller/server'
import { withGatewayContext } from '@/shared/ai/gateway/call-context'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { recordFromJson, readString } from '@/shared/data/json-guards'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
    }

    const body = recordFromJson(await req.json())
    const projectId = readString(body[QueryParam.ProjectId])
    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
    }

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const selection = readString(body.selection)
    const instruction = readString(body.instruction)
    if (!selection || !instruction) {
      return NextResponse.json(
        { error: API_ERROR.MISSING_SELECTION_OR_INSTRUCTION },
        { status: HttpStatus.BAD_REQUEST }
      )
    }

    const beforeText = readString(body.beforeText)
    const afterText = readString(body.afterText)

    const result = await withGatewayContext({ scope }, () =>
      regenerateText(
        scope,
        selection,
        instruction,
        beforeText !== undefined || afterText !== undefined
          ? { beforeText, afterText }
          : undefined
      )
    )

    return NextResponse.json({ result })
  } catch (error) {
    console.error(API_LOG_PREFIX.SCRIPT_EDIT_ERROR, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.FAILED_EDIT_SCRIPT },
      { status: HttpStatus.INTERNAL }
    )
  }
}
