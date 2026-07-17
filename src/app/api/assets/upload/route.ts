import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import { requireAuth } from '@/shared/auth/auth'
import { formFile, formString } from '@/shared/data/form-data-guards'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { AuthBypassFlag, FormField } from '@/shared/data/constants/protocol'
import {
  buildUploadDir,
  createNewAsset,
  parseUploadFileInfo,
  saveUploadFile,
  updateExistingAssetImage,
  validateUploadPath,
  verifyProjectOwnership,
} from './upload-helpers'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) {
      return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formFile(formData, FormField.File)
    const projectId = formString(formData, FormField.ProjectId)
    const assetId = formString(formData, FormField.AssetId)
    const updateExisting = formData.get(FormField.UpdateExisting) === AuthBypassFlag.True

    if (!file || !projectId) {
      return NextResponse.json({ error: API_ERROR.MISSING_FILE_OR_PROJECT_ID }, { status: 400 })
    }

    const ownershipError = await verifyProjectOwnership(projectId, session.user.id)
    if (ownershipError) return ownershipError

    const buffer = Buffer.from(await file.arrayBuffer())
    const { filename, isModel, isImage } = parseUploadFileInfo(file.name)

    if (!isModel && !isImage) {
      return NextResponse.json({ error: API_ERROR.INVALID_ASSET_FILE_TYPE }, { status: 400 })
    }

    const uploadDir = buildUploadDir(projectId)
    const filePath = path.resolve(uploadDir, filename)
    const pathError = validateUploadPath(uploadDir, filePath)
    if (pathError) return pathError

    await saveUploadFile(uploadDir, filePath, buffer)

    if (updateExisting && assetId && isImage) {
      return updateExistingAssetImage({
        assetId,
        filename,
        originalName: file.name,
        fileSize: file.size,
      })
    }

    return createNewAsset({
      projectId,
      userId: session.user.id,
      filename,
      originalName: file.name,
      fileSize: file.size,
      isModel,
      isImage,
      uploadDir,
      filePath,
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.ASSETS_UPLOAD_FAILED, error)
    return NextResponse.json({ error: API_ERROR.UPLOAD_FAILED }, { status: 500 })
  }
}
