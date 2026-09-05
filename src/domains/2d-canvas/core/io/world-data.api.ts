import { ContentType, FetchCache, HttpMethod, JsonField } from '@/shared/data/constants/protocol'
import { fetchJsonRecord, readJsonBody } from '@/shared/data/fetch-json-record'
import { recordFromJson, readString } from '@/shared/data/json-guards'
import { joinUrlPath } from '@/shared/data/url-builder'
import {
  FetchCacheControl,
  FetchRequestHeader,
  WorldDataApiRoute,
  WorldDataStoreError,
} from '../../state/constants/world-data-store'
import { WorldGenSidebarApiRoute } from '../../ui/constants/sidebar'
import { worldProjectSchema, type WorldProject } from './world.dto'

const JSON_HEADERS = { 'Content-Type': ContentType.Json }

export async function fetchStorytellerProject(projectId: string): Promise<WorldProject> {
  const data = await fetchJsonRecord(joinUrlPath(WorldDataApiRoute.StorytellerProject, projectId), {
    cache: FetchCache.NoStore,
    headers: { [FetchRequestHeader.CacheControl]: FetchCacheControl.NoCache },
  })
  return worldProjectSchema.parse(data)
}

export function readSaveImageResponseUrl(data: Record<string, unknown>): string | undefined {
  return readString(data[JsonField.Url])
}

export async function saveProjectImage(input: {
  projectId: string
  filename: string
  imageData: string
}): Promise<{ url?: string }> {
  const data = await fetchJsonRecord(WorldDataApiRoute.SaveImage, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const url = readSaveImageResponseUrl(data)
  return url ? { url } : {}
}

export async function deleteProjectImage(input: {
  projectId: string
  filename: string
}): Promise<void> {
  await fetchJsonRecord(WorldDataApiRoute.DeleteImage, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
}

export async function acceptTileUpscale(input: {
  projectId: string
  x: number
  y: number
  upscaledUrl: string
}): Promise<{ filename: string }> {
  const data = await fetchJsonRecord(WorldDataApiRoute.AcceptUpscale, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
  const filename = readString(data.filename)
  if (!filename) {
    throw new Error(WorldDataStoreError.FailedToAcceptUpscale)
  }
  return { filename }
}

export async function uploadTileBase64(input: {
  projectId: string
  x: number
  y: number
  imageBase64: string
  prompt: string
}): Promise<Record<string, unknown>> {
  return fetchJsonRecord(WorldGenSidebarApiRoute.UploadTile, {
    method: HttpMethod.Post,
    headers: JSON_HEADERS,
    body: JSON.stringify(input),
  })
}

export async function uploadTileFormData(formData: FormData): Promise<Record<string, unknown>> {
  const response = await fetch('/api/tiles/upload', {
    method: HttpMethod.Post,
    body: formData,
  })
  const data = recordFromJson(await readJsonBody(response, {}))
  if (!response.ok) {
    throw new Error(readString(data.error) ?? `Upload failed (${response.status})`)
  }
  return data
}

export async function fetchUrlAsBlob(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch resource: ${response.statusText}`)
  }
  return response.blob()
}

export async function fetchUrlAsDataUrl(url: string): Promise<string | null> {
  try {
    const blob = await fetchUrlAsBlob(url)
    return await new Promise(resolve => {
      const reader = new FileReader()
      reader.onloadend = () => {
        resolve(typeof reader.result === 'string' ? reader.result : null)
      }
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

export async function fetchUrlAsBase64(url: string): Promise<string> {
  const blob = await fetchUrlAsBlob(url)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error(WorldDataStoreError.InvalidDataUrl))
        return
      }
      const commaIndex = reader.result.indexOf(',')
      if (commaIndex === -1) {
        reject(new Error(WorldDataStoreError.InvalidDataUrl))
        return
      }
      resolve(reader.result.slice(commaIndex + 1))
    }
    reader.onerror = () => reject(new Error(WorldDataStoreError.FileReaderError))
    reader.readAsDataURL(blob)
  })
}
