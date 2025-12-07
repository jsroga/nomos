import { supabase } from '@/infrastructure/storage/supabase'
import { v4 as uuidv4 } from 'uuid'

const isProduction = process.env.NODE_ENV === 'production'

export class StorageService {
  /**
   * Saves an image (Base64 or Buffer) to storage.
   * In Dev: Uses local API route to save to filesystem.
   * In Prod: Uploads to Supabase Storage bucket 'projects'.
   */
  async saveImage(projectId: string, filename: string, data: string | Buffer): Promise<string> {
    // Clean filename to avoid deep nesting issues if needed, though existing structure uses folders
    const cleanFilename = filename.startsWith('/') ? filename.slice(1) : filename

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
          contentType: 'image/png',
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
}

export const storageService = new StorageService()
