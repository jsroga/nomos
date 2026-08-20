import { put } from '@vercel/blob'
import fs from 'fs'
import path from 'path'
import {
  BlobAccess,
  ContentType,
  FsDirectory,
  UrlScheme,
} from '@/shared/data/constants/protocol'

export function isPublicHttpsUrl(url: string | undefined | null): url is string {
  return Boolean(url?.startsWith(`${UrlScheme.Https}://`))
}

/** Prefer a hosted public URL so Trigger disk paths are not stored as canon. */
export function resolveDurablePublicImageUrl(persistedUrl: string, sourceUrl: string): string {
  if (isPublicHttpsUrl(persistedUrl)) return persistedUrl
  if (isPublicHttpsUrl(sourceUrl)) return sourceUrl
  return persistedUrl
}

export async function persistGeneratedMedia(input: {
  projectId: string
  filename: string
  bytes: Buffer
  contentType: ContentType
}): Promise<string> {
  const token = process.env.BLOB_READ_WRITE_TOKEN
  if (token) {
    const blob = await put(`${input.projectId}/${input.filename}`, input.bytes, {
      access: BlobAccess.Public,
      token,
      contentType: input.contentType,
      multipart: false,
    })
    return blob.url
  }

  const projectDir = path.join(
    process.cwd(),
    FsDirectory.Public,
    FsDirectory.Projects,
    input.projectId,
  )
  const destPath = path.join(projectDir, input.filename)
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  fs.writeFileSync(destPath, input.bytes)
  return `/${FsDirectory.Projects}/${input.projectId}/${input.filename}`
}

export async function persistGeneratedImage(input: {
  projectId: string
  filename: string
  bytes: Buffer
}): Promise<string> {
  return persistGeneratedMedia({ ...input, contentType: ContentType.Png })
}

export async function persistGeneratedVideo(input: {
  projectId: string
  filename: string
  bytes: Buffer
}): Promise<string> {
  return persistGeneratedMedia({ ...input, contentType: ContentType.Mp4 })
}
