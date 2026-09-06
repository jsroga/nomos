import { NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { tryProjectScope } from '@/shared/auth/project-scope'
import type { ProjectScope } from '@/shared/auth/project-scope'
import { ApiErrorMessage, HttpStatus } from '@/shared/data/constants/protocol'

export async function requireChatSessionCaller(): Promise<
  { error: NextResponse } | { userId: string }
> {
  const { session } = await requireAuth()
  if (!session?.user?.id) {
    return {
      error: NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: HttpStatus.UNAUTHORIZED }),
    }
  }
  return { userId: session.user.id }
}

export async function requireChatSessionProject(
  projectId: string,
  userId: string,
): Promise<{ error: NextResponse } | { scope: ProjectScope }> {
  const scope = await tryProjectScope(projectId, userId)
  if (!scope) {
    return {
      error: NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: HttpStatus.NOT_FOUND }),
    }
  }
  return { scope }
}
