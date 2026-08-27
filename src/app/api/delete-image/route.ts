import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { FsDirectory } from '@/shared/data/constants/protocol'

export const POST = withAuth(
  async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const { projectId, filename } = await request.json()

    if (!projectId || !filename) {
      return NextResponse.json({ error: API_ERROR.MISSING_REQUIRED_FIELDS }, { status: 400 })
    }

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: 404 })
    }

    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename)
    if (sanitizedFilename !== filename) {
      return NextResponse.json({ error: API_ERROR.INVALID_FILENAME }, { status: 400 })
    }

    const filePath = path.join(
      process.cwd(),
      FsDirectory.Public,
      FsDirectory.Projects,
      scope.projectId,
      filename
    )

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: true, message: API_ERROR.FILE_NOT_FOUND })
    }
  }
)
