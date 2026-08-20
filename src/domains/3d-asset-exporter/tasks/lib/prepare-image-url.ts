import { logger } from '@trigger.dev/sdk/v3'
import { supabaseAdmin } from '@/shared/auth/supabase-admin'
import { isPublicHttpUrl } from '@/shared/data/is-public-http-url'
import { storageService } from '@/shared/data/storage/storage-service'
import { StorageMimeType, StorageFileExtension } from '@/shared/data/storage/constants/storage-service'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { EnvVarName, FsDirectory } from '@/shared/data/constants/protocol'
import {
  BufferEncoding,
  DB_COLUMN,
  DB_TABLE,
  MESHY_GENERATION_DB_COLUMN_IMAGE_FILENAME,
  MeshyGenerationLog,
  PrepareImageDataUrlSeparator,
  PrepareImageError,
  PrepareImagePathPrefix,
  PrepareImagePublicDir,
  UrlScheme,
} from '../constants/meshy-generation-wire'

export type PrepareImageUpload = (filename: string, data: Buffer) => Promise<string | null>
export type PrepareImageReadLocal = (imageUrl: string) => Promise<Buffer>
export type PrepareImagePersistUrl = (assetId: string, url: string) => Promise<void>

export interface PrepareImageUrlDeps {
  upload?: PrepareImageUpload
  readLocalFile?: PrepareImageReadLocal
  persistAssetUrl?: PrepareImagePersistUrl
}

function decodeDataUriBuffer(imageUrl: string): Buffer {
  const separatorIndex = imageUrl.indexOf(PrepareImageDataUrlSeparator.MimeBase64)
  if (separatorIndex === -1) {
    throw new Error(PrepareImageError.NotPublic)
  }
  const base64 = imageUrl.slice(separatorIndex + PrepareImageDataUrlSeparator.MimeBase64.length)
  const buffer = Buffer.from(base64, BufferEncoding.Base64)
  if (buffer.length === 0) {
    throw new Error(PrepareImageError.NotPublic)
  }
  return buffer
}

async function defaultReadLocalFile(imageUrl: string): Promise<Buffer> {
  const fs = await import('fs')
  const path = await import('path')
  const filePath = path.join(process.cwd(), PrepareImagePublicDir.Public, imageUrl)
  if (!fs.existsSync(filePath)) {
    throw new Error(`${PrepareImageError.NotFoundPrefix} ${imageUrl}`)
  }
  return fs.readFileSync(filePath)
}

async function loadPrepareImageBytes(
  imageUrl: string,
  readLocalFile: PrepareImageReadLocal,
): Promise<Buffer> {
  if (imageUrl.startsWith(UrlScheme.Data)) {
    return decodeDataUriBuffer(imageUrl)
  }
  if (imageUrl.startsWith(PrepareImagePathPrefix.Projects)) {
    return readLocalFile(imageUrl)
  }
  throw new Error(PrepareImageError.NotPublic)
}

async function defaultUpload(filename: string, data: Buffer): Promise<string | null> {
  if (!process.env[EnvVarName.BlobReadWriteToken]) {
    throw new Error(API_ERROR.BLOB_TOKEN_NOT_CONFIGURED)
  }
  return storageService.uploadPublicFile(filename, data, StorageMimeType.Png)
}

async function defaultPersistAssetUrl(assetId: string, url: string): Promise<void> {
  await supabaseAdmin
    .from(DB_TABLE.ASSETS)
    .update({ [MESHY_GENERATION_DB_COLUMN_IMAGE_FILENAME]: url })
    .eq(DB_COLUMN.ID, assetId)
}

function blobUploadFilename(assetId: string | undefined): string {
  const id = assetId || FsDirectory.Assets
  return `${FsDirectory.Assets}/${id}.${StorageFileExtension.Png}`
}

async function uploadPreparedImage(
  buffer: Buffer,
  assetId: string | undefined,
  upload: PrepareImageUpload,
): Promise<string> {
  const publicUrl = await upload(blobUploadFilename(assetId), buffer)
  if (!publicUrl || !isPublicHttpUrl(publicUrl)) {
    throw new Error(PrepareImageError.BlobUploadFailed)
  }
  return publicUrl
}

export async function prepareImageUrl(
  imageUrl: string,
  assetId?: string,
  deps: PrepareImageUrlDeps = {},
): Promise<string> {
  if (isPublicHttpUrl(imageUrl)) {
    return imageUrl
  }

  const buffer = await loadPrepareImageBytes(imageUrl, deps.readLocalFile ?? defaultReadLocalFile)
  const publicUrl = await uploadPreparedImage(buffer, assetId, deps.upload ?? defaultUpload)

  if (assetId) {
    try {
      await (deps.persistAssetUrl ?? defaultPersistAssetUrl)(assetId, publicUrl)
    } catch (dbErr) {
      logger.error(MeshyGenerationLog.FailedDbUpdate, { dbErr })
    }
  }

  return publicUrl
}
