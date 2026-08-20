import path from 'path'
import fs from 'fs'
import { storageService } from '@/shared/data/storage/storage-service'
import { isPublicHttpUrl } from '@/shared/data/is-public-http-url'
import {
  BufferEncoding,
  EnvVarName,
  FsDirectory,
} from '@/shared/data/constants/protocol'
import { StorageMimeType } from '@/shared/data/storage/constants/storage-service'

export enum SaveImageDecodeKind {
  Empty = 'empty',
  Invalid = 'invalid',
}

export function assetsSavePrefix(): string {
  return `${FsDirectory.Assets}/`
}

export function isAssetsSaveFilename(filename: string): boolean {
  return filename.startsWith(assetsSavePrefix())
}

export function decodeSaveImageBuffer(
  imageData: string,
): { ok: true; buffer: Buffer } | { ok: false; kind: SaveImageDecodeKind } {
  const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '')
  if (!base64Data) {
    return { ok: false, kind: SaveImageDecodeKind.Empty }
  }
  const buffer = Buffer.from(base64Data, BufferEncoding.Base64)
  if (buffer.length === 0) {
    return { ok: false, kind: SaveImageDecodeKind.Invalid }
  }
  return { ok: true, buffer }
}

export async function persistAssetsImageToBlob(
  projectId: string,
  filename: string,
  buffer: Buffer,
): Promise<string | null> {
  if (!process.env[EnvVarName.BlobReadWriteToken]) {
    return null
  }
  const blobPath = `${FsDirectory.Assets}/${projectId}/${path.basename(filename)}`
  const url = await storageService.uploadPublicFile(blobPath, buffer, StorageMimeType.Png)
  if (!url || !isPublicHttpUrl(url)) {
    return null
  }
  return url
}

export function writeLocalProjectImage(filePath: string, buffer: Buffer): { size: number } {
  const fileDir = path.dirname(filePath)
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir, { recursive: true })
  }
  fs.writeFileSync(filePath, buffer)
  const stats = fs.statSync(filePath)
  return { size: stats.size }
}

export function localProjectImagePath(projectId: string, filename: string): string {
  return `/${FsDirectory.Projects}/${projectId}/${filename}`
}
