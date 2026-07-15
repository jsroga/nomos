import { put } from '@vercel/blob'
import {
  StorageApiRoute,
  StorageBucket,
  StorageClientError,
  StorageFileExtension,
  StorageFormField,
  StorageHttpMethod,
  StorageLogField,
  StorageLogMessage,
  StorageMimeType,
  StoragePathPrefix,
  TmpFilesApi,
  TmpFilesResponseStatus,
} from '@/shared/data/storage/constants/storage-service'
import {
  BlobAccess,
  BufferEncoding,
  ContentType,
  FsDirectory,
  HttpMethod,
  NodeEnv,
  UrlScheme,
} from '@/shared/data/constants/protocol'
import { supabase } from '@/shared/data/storage/supabase'

const isProduction = process.env.NODE_ENV === NodeEnv.Production

export class StorageService {
  /**
   * Saves an image (Base64 or Buffer) to storage.
   * In Dev: Uses local API route to save to filesystem.
   * In Prod: Uploads to Supabase Storage bucket 'projects'.
   */
  async saveImage(
    projectId: string,
    filename: string,
    data: string | Buffer,
    contentType?: string
  ): Promise<string> {
    // Clean filename to avoid deep nesting issues if needed, though existing structure uses folders
    const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename

    // Auto-detect content type if not specific
    const finalContentType = contentType || this.getContentType(filename)

    if (isProduction) {
      // SUPABASE STORAGE
      // Convert base64 string to Buffer/Blob if needed
      let body: Buffer | Blob
      if (typeof data === 'string') {
        const base64Data = data.replace(/^data:image\/\w+;base64,/, '')
        body = Buffer.from(base64Data, BufferEncoding.Base64)
      } else {
        body = data
      }

      // Upload
      const { error } = await supabase.storage
        .from(StorageBucket.Projects)
        .upload(`${projectId}/${cleanFilename}`, body, {
          contentType: finalContentType,
          upsert: true,
        })

      if (error) throw error

      // Return public URL (or signed URL logic later)
      const {
        data: { publicUrl },
      } = supabase.storage.from(StorageBucket.Projects).getPublicUrl(`${projectId}/${cleanFilename}`)

      return publicUrl
    } else {
      // LOCAL FILESYSTEM (DEV)
      // Use the existing API route
      let imageData = ''
      if (Buffer.isBuffer(data)) {
        imageData = data.toString(BufferEncoding.Base64)
      } else {
        imageData = data
      }

      const response = await fetch(StorageApiRoute.SaveImage, {
        method: HttpMethod.Post,
        headers: { 'Content-Type': ContentType.Json },
        body: JSON.stringify({
          projectId,
          filename: cleanFilename,
          imageData,
        }),
      })

      if (!response.ok) throw new Error(StorageClientError.FailedSaveImageLocally)

      const result = await response.json()
      return result.path // e.g. /projects/123/image.png
    }
  }

  /**
   * Helper to get the full URL for an image given its filename and project.
   * Abstraction to handle the difference between local paths and storage URLs.
   */
  getImageUrl(projectId: string, filename: string): string {
    // If filename is already a full URL (e.g. from Vercel Blob), return as-is
    if (filename.startsWith(`${UrlScheme.Http}://`) || filename.startsWith(`${UrlScheme.Https}://`)) {
      return filename
    }

    if (isProduction) {
      const {
        data: { publicUrl },
      } = supabase.storage.from(StorageBucket.Projects).getPublicUrl(`${projectId}/${filename}`)
      return publicUrl
    } else {
      // Local dev path logic
      return `/${FsDirectory.Projects}/${projectId}/${filename}`
    }
  }

  /**
   * Force upload to a public host to get a URL (required for external AI services like Midjourney/LegNext)
   * Priority: Vercel Blob -> Supabase -> TmpFiles
   */
  async uploadPublicImage(filename: string, data: string | Buffer): Promise<string | null> {
    return this.uploadPublicFile(filename, data, StorageMimeType.Png)
  }

  /**
   * Upload any file to a public host to get a URL (for external AI services like Meshy)
   * Handles images, GLB models, etc.
   * Priority: Vercel Blob -> Supabase -> TmpFiles (images only for tmpfiles)
   */
  async uploadPublicFile(
    filename: string,
    data: string | Buffer,
    contentType: string = StorageMimeType.OctetStream
  ): Promise<string | null> {
    try {
      // 1. Try Vercel Blob (Primary)
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        return this.uploadToVercelBlob(filename, data, contentType)
      }

      console.warn(StorageLogMessage.VercelBlobTokenMissing)

      // 2. Fallback: Try Supabase
      let body: Buffer | Blob
      if (typeof data === 'string') {
        // Handle data URIs (data:application/octet-stream;base64,...) or raw base64
        const base64Data = data.replace(/^data:[^;]+;base64,/, '')
        body = Buffer.from(base64Data, BufferEncoding.Base64)
      } else {
        body = data
      }

      const path = `${StoragePathPrefix.Temp}${filename}`
      const { error } = await supabase.storage.from(StorageBucket.Projects).upload(path, body, {
        contentType,
        upsert: true,
      })

      if (!error) {
        const { data: publicData } = supabase.storage.from(StorageBucket.Projects).getPublicUrl(path)
        return publicData.publicUrl
      }

      console.warn(StorageLogMessage.SupabaseUploadFailed, error)

      // 3. Last Resort: TmpFiles (only supports images)
      if (contentType.startsWith('image/')) {
        return this.uploadToTempHost(filename, data)
      }

      console.warn(StorageLogMessage.TmpFilesNonImage)
      return null
    } catch (e) {
      console.warn(StorageLogMessage.PublicFileUploadFailed, e)
      return null
    }
  }

  private async uploadToVercelBlob(
    filename: string,
    data: string | Buffer,
    contentType: string = StorageMimeType.Png
  ): Promise<string | null> {
    try {
      let body: Buffer
      if (typeof data === 'string') {
        // Handle both data URIs and raw base64 strings
        const base64Data = data.replace(/^data:[^;]+;base64,/, '')
        body = Buffer.from(base64Data, BufferEncoding.Base64)
      } else {
        // data is already a Buffer
        body = data
      }

      console.log(StorageLogMessage.VercelBlobTokenPresent, !!process.env.BLOB_READ_WRITE_TOKEN)
      console.log(
        StorageLogMessage.VercelBlobUploading,
        filename,
        StorageLogField.Size,
        body.byteLength,
        StorageLogField.ContentType,
        contentType
      )

      const blob = await put(filename, body, {
        access: BlobAccess.Public,
        token: process.env.BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
        contentType,
        multipart: false,
      })

      console.log(StorageLogMessage.VercelBlobUploadResponse, {
        url: blob.url,
        contentType: blob.contentType,
        pathname: blob.pathname,
      })

      // Wait briefly for propagation
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify URL is accessible
      try {
        const headResp = await fetch(blob.url, { method: StorageHttpMethod.Head })
        console.log(
          StorageLogMessage.VercelBlobVerificationHead,
          headResp.status,
          headResp.statusText
        )
        if (!headResp.ok) {
          console.warn(StorageLogMessage.VercelBlobUrlNotAccessible)
          return null
        }
      } catch (verifyErr) {
        console.error(StorageLogMessage.VercelBlobVerificationFailed, verifyErr)
        return null
      }

      return blob.url
    } catch (error) {
      console.error(StorageLogMessage.VercelBlobUploadFailed, error)
      return null
    }
  }

  /**
   * Fallback: Upload to tmpfiles.org (no auth required, files expire in 60m)
   * This ensures the AI can access the image even if local Supabase isn't configured.
   */
  private async uploadToTempHost(filename: string, data: string | Buffer): Promise<string | null> {
    try {
      // Prepare FormData
      const formData = new FormData()
      let blob: Blob

      if (typeof data === 'string') {
        const base64Data = data.replace(/^data:image\/\w+;base64,/, '')
        const byteCharacters = atob(base64Data)
        const byteNumbers = new Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i)
        }
        const byteArray = new Uint8Array(byteNumbers)
        blob = new Blob([byteArray], { type: StorageMimeType.Png })
      } else {
        blob = new Blob([new Uint8Array(data)], { type: StorageMimeType.Png })
      }

      formData.append(StorageFormField.File, blob, filename)

      // Upload
      const response = await fetch(TmpFilesApi.UploadUrl, {
        method: StorageHttpMethod.Post,
        body: formData,
      })

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`)

      const result = await response.json()
      const resultRecord =
        typeof result === 'object' && result !== null ? result : {}
      const dataField =
        typeof resultRecord.data === 'object' && resultRecord.data !== null
          ? resultRecord.data
          : null
      const viewUrl =
        dataField && typeof dataField.url === 'string' ? dataField.url : null
      if (resultRecord.status === TmpFilesResponseStatus.Success && viewUrl) {
        // Convert view URL to direct download URL
        // Example: https://tmpfiles.org/123/img.png -> https://tmpfiles.org/dl/123/img.png
        const dlUrl = viewUrl.replace(TmpFilesApi.ViewPathSegment, TmpFilesApi.DownloadPathSegment)
        return dlUrl
      }

      return null
    } catch (err) {
      console.error(StorageLogMessage.TempHostUploadFailed, err)
      return null
    }
  }
  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case StorageFileExtension.Glb:
        return StorageMimeType.GltfBinary
      case StorageFileExtension.Gltf:
        return StorageMimeType.GltfJson
      case StorageFileExtension.Png:
        return StorageMimeType.Png
      case StorageFileExtension.Jpg:
      case StorageFileExtension.Jpeg:
        return StorageMimeType.Jpeg
      case StorageFileExtension.Webp:
        return StorageMimeType.Webp
      case StorageFileExtension.Svg:
        return StorageMimeType.SvgXml
      default:
        return StorageMimeType.OctetStream
    }
  }
}

export const storageService = new StorageService()
