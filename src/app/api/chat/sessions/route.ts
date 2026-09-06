import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { ApiErrorMessage, HttpStatus, QueryParam } from '@/shared/data/constants/protocol'
import { readJsonBody } from '@/shared/data/fetch-json-record'
import { createChatSessionBodySchema } from '@/shared/chat/core/io/chat-session-contract'
import { insertChatSession, listOwnedChatSessions } from '@/shared/chat/core/io/chat-session-store'

export async function GET(req: NextRequest) {
  const { session } = await requireAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  const projectId = req.nextUrl.searchParams.get(QueryParam.ProjectId)
  if (!projectId) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
  }
  const scope = await tryProjectScope(projectId, session.user.id)
  if (!scope) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  const sessions = await listOwnedChatSessions({
    projectId: scope.projectId,
    userId: session.user.id,
  })
  return NextResponse.json(sessions)
}

export async function POST(req: NextRequest) {
  const { session } = await requireAuth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED })
  }
  const parsed = createChatSessionBodySchema.safeParse(await readJsonBody(req, null))
  if (!parsed.success) {
    return NextResponse.json({ error: ApiErrorMessage.INVALID_ACTION }, { status: HttpStatus.BAD_REQUEST })
  }
  const scope = await tryProjectScope(parsed.data.projectId, session.user.id)
  if (!scope) {
    return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND })
  }
  const created = await insertChatSession({
    id: crypto.randomUUID(),
    projectId: scope.projectId,
    userId: session.user.id,
    moduleId: parsed.data.moduleId,
  })
  if (!created) {
    return NextResponse.json({ error: ApiErrorMessage.INTERNAL_ERROR }, { status: HttpStatus.INTERNAL })
  }
  return NextResponse.json(created, { status: HttpStatus.CREATED })
}
