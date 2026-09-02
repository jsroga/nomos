import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import {
  withAuth,
  withRateLimit,
  type AuthenticatedRequest } from '@/shared/data/api-utils'
import { tryProjectScope } from '@/shared/auth/project-scope'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { FsDirectory, HttpStatus, JsonField } from '@/shared/data/constants/protocol'
import {
  decodeSaveImageBuffer,
  isAssetsSaveFilename,
  localProjectImagePath,
  persistAssetsImageToBlob,
  SaveImageDecodeKind,
  writeLocalProjectImage,
} from './save-image-persist'

export const maxDuration = 60

export const POST = withRateLimit(
  withAuth(async (request: NextRequest, { session }: AuthenticatedRequest) => {
    const body = await request.json()
    const { projectId, filename, imageData } = body

    if (!projectId || !filename) {
      return NextResponse.json(
        { error: API_ERROR.MISSING_PROJECT_ID_OR_FILENAME },
        { status: HttpStatus.BAD_REQUEST },
      )
    }

    if (!imageData) {
      return NextResponse.json({ error: API_ERROR.MISSING_IMAGE_DATA }, { status: HttpStatus.BAD_REQUEST })
    }

    const scope = await tryProjectScope(projectId, session.user.id)
    if (!scope) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ACCESS_DENIED }, { status: HttpStatus.NOT_FOUND })
    }

    const sanitizedFilename = path.basename(filename)
    if (sanitizedFilename !== filename && !isAssetsSaveFilename(filename)) {
      return NextResponse.json({ error: API_ERROR.INVALID_FILENAME }, { status: HttpStatus.BAD_REQUEST })
    }

    const projectDir = path.join(process.cwd(), FsDirectory.Public, FsDirectory.Projects, scope.projectId)
    const filePath = path.resolve(projectDir, filename)

    if (!filePath.startsWith(projectDir + path.sep) && filePath !== projectDir) {
      return NextResponse.json({ error: API_ERROR.INVALID_FILENAME }, { status: HttpStatus.BAD_REQUEST })
    }

    const decoded = decodeSaveImageBuffer(imageData)
    if (!decoded.ok) {
      const error =
        decoded.kind === SaveImageDecodeKind.Empty
          ? API_ERROR.EMPTY_IMAGE_DATA
          : API_ERROR.INVALID_BASE64_DATA
      return NextResponse.json({ error }, { status: HttpStatus.BAD_REQUEST })
    }

    if (isAssetsSaveFilename(filename)) {
      const url = await persistAssetsImageToBlob(scope.projectId, filename, decoded.buffer)
      if (!url) {
        return NextResponse.json(
          { error: API_ERROR.BLOB_TOKEN_NOT_CONFIGURED },
          { status: HttpStatus.INTERNAL },
        )
      }
      return NextResponse.json({ success: true, [JsonField.Url]: url })
    }

    const { size } = writeLocalProjectImage(filePath, decoded.buffer)
    return NextResponse.json({
      success: true,
      path: localProjectImagePath(scope.projectId, filename),
      size,
    })
  }),
  { maxRequests: 60, windowMs: 60000 }
)
