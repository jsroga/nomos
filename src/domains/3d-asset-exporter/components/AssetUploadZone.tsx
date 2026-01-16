'use client'

import React, { useState, useRef, DragEvent } from 'react'
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

const SUPPORTED_FORMATS = {
  images: ['.png', '.jpg', '.jpeg', '.webp'],
  models: ['.glb', '.gltf', '.fbx', '.obj', '.usdz'],
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  assetId?: string
}

interface AssetUploadZoneProps {
  projectId: string
  onUploadComplete?: (assetIds: string[]) => void
}

export const AssetUploadZone: React.FC<AssetUploadZoneProps> = ({
  projectId,
  onUploadComplete,
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [files, setFiles] = useState<UploadFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allFormats = [...SUPPORTED_FORMATS.images, ...SUPPORTED_FORMATS.models]

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allFormats.includes(ext)) {
      return { valid: false, error: `Unsupported format: ${ext}` }
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File exceeds 50MB limit' }
    }

    return { valid: true }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map(file => {
      const validation = validateFile(file)
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: validation.valid ? 'pending' : 'error',
        progress: 0,
        error: validation.error,
      }
    })

    setFiles(prev => [...prev, ...newFiles])

    // Start uploading valid files
    newFiles.forEach(uploadFile => {
      if (uploadFile.status === 'pending') {
        uploadSingleFile(uploadFile)
      }
    })
  }

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    setFiles(prev => prev.map(f => (f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)))

    try {
      const formData = new FormData()
      formData.append('file', uploadFile.file)
      formData.append('projectId', projectId)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setFiles(prev => prev.map(f => (f.id === uploadFile.id ? { ...f, progress } : f)))
        }
      })

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          setFiles(prev =>
            prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, status: 'success', progress: 100, assetId: response.assetId }
                : f
            )
          )

          // Immediately trigger refresh callback for this asset
          if (onUploadComplete && response.assetId) {
            onUploadComplete([response.assetId])
          }
        } else {
          throw new Error(`Upload failed: ${xhr.statusText}`)
        }
      })

      // Handle errors
      xhr.addEventListener('error', () => {
        setFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id ? { ...f, status: 'error', error: 'Network error' } : f
          )
        )
      })

      xhr.open('POST', '/api/assets/upload')
      xhr.send(formData)
    } catch (error: any) {
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'error', error: error.message } : f
        )
      )
    }
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files)
    }
  }

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const clearCompleted = () => {
    const completedAssetIds = files
      .filter(f => f.status === 'success' && f.assetId)
      .map(f => f.assetId!)

    if (onUploadComplete && completedAssetIds.length > 0) {
      onUploadComplete(completedAssetIds)
    }

    setFiles(prev => prev.filter(f => f.status !== 'success'))
  }

  const hasUploading = files.some(f => f.status === 'uploading')
  const hasCompleted = files.some(f => f.status === 'success')

  return (
    <div className="w-full space-y-3">
      {/* Upload Button & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-4 transition-all w-full
          ${
            isDragging
              ? 'border-primary bg-primary/5 scale-[0.99]'
              : 'border-border bg-background/50 hover:border-primary/50 hover:bg-background/80'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={allFormats.join(',')}
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="flex flex-col items-center gap-2 text-center">
          <Upload size={24} className={isDragging ? 'text-primary' : 'text-muted-foreground'} />
          <div>
            <p className="text-sm font-medium">
              {isDragging ? 'Drop files here' : 'Upload Assets'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">2D images or 3D models • Max 50MB</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleButtonClick}
            disabled={hasUploading}
            className="mt-1"
          >
            <Upload size={14} className="mr-1" />
            Choose Files
          </Button>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="w-full space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Uploads ({files.length})</p>
            {hasCompleted && !hasUploading && (
              <Button size="sm" variant="ghost" onClick={clearCompleted} className="h-6 text-xs">
                Clear Completed
              </Button>
            )}
          </div>

          <div className="w-full space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {files.map(uploadFile => (
              <div
                key={uploadFile.id}
                className="flex items-center gap-2 p-2 bg-background/50 border border-border rounded-md text-xs overflow-hidden"
              >
                {/* Status Icon */}
                {uploadFile.status === 'uploading' && (
                  <Loader2 size={14} className="text-blue-500 animate-spin flex-shrink-0" />
                )}
                {uploadFile.status === 'success' && (
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                )}
                {uploadFile.status === 'error' && (
                  <AlertCircle size={14} className="text-destructive flex-shrink-0" />
                )}
                {uploadFile.status === 'pending' && (
                  <Loader2 size={14} className="text-muted-foreground animate-spin flex-shrink-0" />
                )}

                {/* File Info */}
                <div className="flex-1 w-0">
                  <p className="font-medium truncate">{uploadFile.file.name}</p>
                  {uploadFile.status === 'uploading' && (
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}
                  {uploadFile.status === 'error' && uploadFile.error && (
                    <p className="text-destructive text-[10px] mt-0.5">{uploadFile.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                {uploadFile.status !== 'uploading' && (
                  <button
                    onClick={() => removeFile(uploadFile.id)}
                    className="p-1 hover:bg-muted rounded"
                  >
                    <X size={12} className="text-muted-foreground" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
