import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/shared/auth/auth'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { secureLog } from '@/shared/auth/security'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { ApiErrorMessage } from '@/shared/data/constants/protocol'
import {
  fetchAndWriteModelFile,
  validateSaveModelRequest,
} from './save-model-helpers'

export async function POST(request: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: 401 })
    }

    const validation = await validateSaveModelRequest(request, session.user.id)
    if (validation instanceof NextResponse) return validation

    const writeError = await fetchAndWriteModelFile(
      validation.payload.modelUrl,
      validation.sanitizedPath
    )
    if (writeError) return writeError

    return NextResponse.json({
      success: true,
      path: `/projects/${validation.payload.projectId}/assets/${validation.safeFilename}`,
    })
  } catch (error: unknown) {
    secureLog.error(API_LOG_PREFIX.SAVE_MODEL_ERROR, { message: getErrorMessage(error) })
    return NextResponse.json({ error: API_ERROR.FAILED_SAVE_MODEL }, { status: 500 })
  }
}
