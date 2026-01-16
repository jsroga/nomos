import { put } from '@vercel/blob'
import { supabase } from '@/infrastructure/storage/supabase'

const isProduction = process.env.NODE_ENV === 'production'

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
        body = Buffer.from(base64Data, 'base64')
      } else {
        body = data
      }

      // Upload
      const { data: uploadData, error } = await supabase.storage
        .from('projects')
        .upload(`${projectId}/${cleanFilename}`, body, {
          contentType: finalContentType,
          upsert: true,
        })

      if (error) throw error

      // Return public URL (or signed URL logic later)
      const {
        data: { publicUrl },
      } = supabase.storage.from('projects').getPublicUrl(`${projectId}/${cleanFilename}`)

      return publicUrl
    } else {
      // LOCAL FILESYSTEM (DEV)
      // Use the existing API route
      let imageData = ''
      if (Buffer.isBuffer(data)) {
        imageData = data.toString('base64')
      } else {
        imageData = data
      }

      const response = await fetch('/api/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          filename: cleanFilename,
          imageData,
        }),
      })

      if (!response.ok) throw new Error('Failed to save image locally')

      const result = await response.json()
      return result.path // e.g. /projects/123/image.png
    }
  }

  /**
   * Helper to get the full URL for an image given its filename and project.
   * Abstraction to handle the difference between local paths and storage URLs.
   */
  getImageUrl(projectId: string, filename: string): string {
    if (isProduction) {
      const {
        data: { publicUrl },
      } = supabase.storage.from('projects').getPublicUrl(`${projectId}/${filename}`)
      return publicUrl
    } else {
      // Local dev path logic
      return `/projects/${projectId}/${filename}`
    }
  }

  /**
   * Force upload to a public host to get a URL (required for external AI services like Midjourney/LegNext)
   * Priority: Vercel Blob -> Supabase -> TmpFiles
   */
  async uploadPublicImage(filename: string, data: string | Buffer): Promise<string | null> {
    return this.uploadPublicFile(filename, data, 'image/png')
  }

  /**
   * Upload any file to a public host to get a URL (for external AI services like Meshy)
   * Handles images, GLB models, etc.
   * Priority: Vercel Blob -> Supabase -> TmpFiles (images only for tmpfiles)
   */
  async uploadPublicFile(
    filename: string,
    data: string | Buffer,
    contentType: string = 'application/octet-stream'
  ): Promise<string | null> {
    try {
      // 1. Try Vercel Blob (Primary)
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        return this.uploadToVercelBlob(filename, data, contentType)
      }

      console.warn('Vercel Blob token not found (BLOB_READ_WRITE_TOKEN), falling back...')

      // 2. Fallback: Try Supabase
      let body: Buffer | Blob
      if (typeof data === 'string') {
        // Handle data URIs (data:application/octet-stream;base64,...) or raw base64
        const base64Data = data.replace(/^data:[^;]+;base64,/, '')
        body = Buffer.from(base64Data, 'base64')
      } else {
        body = data
      }

      const path = `temp/${filename}`
      const { error } = await supabase.storage.from('projects').upload(path, body, {
        contentType,
        upsert: true,
      })

      if (!error) {
        const { data: publicData } = supabase.storage.from('projects').getPublicUrl(path)
        return publicData.publicUrl
      }

      console.warn('Supabase upload failed:', error)

      // 3. Last Resort: TmpFiles (only supports images)
      if (contentType.startsWith('image/')) {
        return this.uploadToTempHost(filename, data)
      }

      console.warn('TmpFiles does not support non-image content types')
      return null
    } catch (e) {
      console.warn('Public file upload failed:', e)
      return null
    }
  }

  private async uploadToVercelBlob(
    filename: string,
    data: string | Buffer,
    contentType: string = 'image/png'
  ): Promise<string | null> {
    try {
      let body: Buffer
      if (typeof data === 'string') {
        // Handle both data URIs and raw base64 strings
        const base64Data = data.replace(/^data:[^;]+;base64,/, '')
        body = Buffer.from(base64Data, 'base64')
      } else {
        // data is already a Buffer
        body = data
      }

      console.log('[Vercel Blob] Token present?', !!process.env.BLOB_READ_WRITE_TOKEN)
      console.log(
        '[Vercel Blob] Uploading:',
        filename,
        'size:',
        body.byteLength,
        'contentType:',
        contentType
      )

      const blob = await put(filename, body, {
        access: 'public',
        token: process.env.BLOB_READ_WRITE_TOKEN || process.env.NEXT_PUBLIC_BLOB_READ_WRITE_TOKEN,
        contentType,
        multipart: false,
      })

      console.log('[Vercel Blob] Upload response:', {
        url: blob.url,
        contentType: blob.contentType,
        pathname: blob.pathname,
      })

      // Wait briefly for propagation
      await new Promise(resolve => setTimeout(resolve, 500))

      // Verify URL is accessible
      try {
        const headResp = await fetch(blob.url, { method: 'HEAD' })
        console.log(
          '[Vercel Blob] Verification HEAD request:',
          headResp.status,
          headResp.statusText
        )
        if (!headResp.ok) {
          console.warn('[Vercel Blob] URL not accessible yet - falling back to Supabase')
          return null
        }
      } catch (verifyErr) {
        console.error('[Vercel Blob] Verification failed:', verifyErr)
        return null
      }

      return blob.url
    } catch (error) {
      console.error('Vercel Blob upload failed:', error)
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
        blob = new Blob([byteArray], { type: 'image/png' })
      } else {
        // Fix: buffer might be Node Buffer, convert to Uint8Array for Blob
        const bufferData = Buffer.isBuffer(data) ? new Uint8Array(data) : (data as any)
        blob = new Blob([bufferData], { type: 'image/png' })
      }

      formData.append('file', blob, filename)

      // Upload
      const response = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`)

      const result = await response.json()
      if (result.status === 'success' && result.data.url) {
        // Convert view URL to direct download URL
        // Example: https://tmpfiles.org/123/img.png -> https://tmpfiles.org/dl/123/img.png
        const viewUrl = result.data.url as string
        const dlUrl = viewUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
        return dlUrl
      }

      return null
    } catch (err) {
      console.error('Temp host upload failed:', err)
      return null
    }
  }
  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'glb':
        return 'model/gltf-binary'
      case 'gltf':
        return 'model/gltf+json'
      case 'png':
        return 'image/png'
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg'
      case 'webp':
        return 'image/webp'
      case 'svg':
        return 'image/svg+xml'
      default:
        return 'application/octet-stream'
    }
  }
}

export const storageService = new StorageService()
