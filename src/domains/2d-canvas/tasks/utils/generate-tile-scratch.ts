/**
 * Retry scratch for generate-tile: a stable blob key so a retried run does
 * not call the image provider a second time.
 */

import { put } from '@vercel/blob'
import { metadata } from '@trigger.dev/sdk'
import { BufferEncoding, BlobAccess, ContentType } from '@/shared/data/constants/protocol'
import { readString, recordFromJson } from '@/shared/data/json-guards'
import { requireBlobToken } from './generate-tile-persist'
import { GenerateTileMetadataKey } from './generate-tile-progress'
import { assertTilePngSize } from './generate-tile-output'

export enum GenerateTileScratchFile {
  Suffix = '_retry.png',
}

export function tileScratchPath(projectId: string, x: number, y: number): string {
  return `tiles/${projectId}/${x}_${y}${GenerateTileScratchFile.Suffix}`
}

export function readTileScratchUrl(): string | undefined {
  return readString(recordFromJson(metadata.current())[GenerateTileMetadataKey.ScratchUrl])
}

export async function writeTileScratchUrl(url: string): Promise<void> {
  await metadata.set(GenerateTileMetadataKey.ScratchUrl, url)
}

function pngBufferFromBase64(imageBase64: string): Buffer {
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
  return Buffer.from(base64Data, BufferEncoding.Base64)
}

export async function uploadTileScratch(
  projectId: string,
  x: number,
  y: number,
  imageBase64: string,
): Promise<string> {
  const buffer = pngBufferFromBase64(imageBase64)
  await assertTilePngSize(buffer)
  const blob = await put(tileScratchPath(projectId, x, y), buffer, {
    access: BlobAccess.Public,
    token: requireBlobToken(),
    contentType: ContentType.Png,
    addRandomSuffix: false,
    allowOverwrite: true,
  })
  return blob.url
}

export async function downloadTileScratchBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download tile scratch: ${response.status}`)
  }
  const buffer = Buffer.from(await response.arrayBuffer())
  return buffer.toString(BufferEncoding.Base64)
}
