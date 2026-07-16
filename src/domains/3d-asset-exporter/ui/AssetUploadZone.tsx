'use client'

import React, { useState, useRef, DragEvent } from 'react'
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { getErrorMessage } from '@/shared/errors/error-utils'
import {
  ASSET_SUPPORTED_FORMATS,
  ASSET_UPLOAD_ENDPOINT,
  ASSET_UPLOAD_FILE_SIZE_ERROR,
  ASSET_UPLOAD_FORM_FIELD_FILE,
  ASSET_UPLOAD_FORM_FIELD_PROJECT_ID,
  ASSET_UPLOAD_HTTP_METHOD,
  ASSET_UPLOAD_NETWORK_ERROR,
  AssetUploadStatus,
  AssetUploadXhrEvent,
} from '@/domains/3d-asset-exporter/constants/asset-upload'

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

interface UploadFile {
  file: File
  id: string
  status: AssetUploadStatus
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

  const allFormats: string[] = [...ASSET_SUPPORTED_FORMATS.images, ...ASSET_SUPPORTED_FORMATS.models]

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allFormats.includes(ext)) {
      return { valid: false, error: `Unsupported format: ${ext}` }
    }

    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: ASSET_UPLOAD_FILE_SIZE_ERROR }
    }

    return { valid: true }
  }

  const handleFiles = (fileList: FileList) => {
    const newFiles: UploadFile[] = Array.from(fileList).map(file => {
      const validation = validateFile(file)
      return {
        file,
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        status: validation.valid ? AssetUploadStatus.Pending : AssetUploadStatus.Error,
        progress: 0,
        error: validation.error,
      }
    })

    setFiles(prev => [...prev, ...newFiles])

    // Start uploading valid files
    newFiles.forEach(uploadFile => {
      if (uploadFile.status === AssetUploadStatus.Pending) {
        uploadSingleFile(uploadFile)
      }
    })
  }

  const uploadSingleFile = async (uploadFile: UploadFile) => {
    setFiles(prev =>
      prev.map(f =>
        f.id === uploadFile.id ? { ...f, status: AssetUploadStatus.Uploading } : f
      )
    )

    try {
      const formData = new FormData()
      formData.append(ASSET_UPLOAD_FORM_FIELD_FILE, uploadFile.file)
      formData.append(ASSET_UPLOAD_FORM_FIELD_PROJECT_ID, projectId)

      const xhr = new XMLHttpRequest()

      // Track upload progress
      xhr.upload.addEventListener(AssetUploadXhrEvent.Progress, e => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setFiles(prev => prev.map(f => (f.id === uploadFile.id ? { ...f, progress } : f)))
        }
      })

      // Handle completion
      xhr.addEventListener(AssetUploadXhrEvent.Load, () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          setFiles(prev =>
            prev.map(f =>
              f.id === uploadFile.id
                ? {
                    ...f,
                    status: AssetUploadStatus.Success,
                    progress: 100,
                    assetId: response.assetId,
                  }
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
      xhr.addEventListener(AssetUploadXhrEvent.Error, () => {
        setFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: AssetUploadStatus.Error, error: ASSET_UPLOAD_NETWORK_ERROR }
              : f
          )
        )
      })

      xhr.open(ASSET_UPLOAD_HTTP_METHOD, ASSET_UPLOAD_ENDPOINT)
      xhr.send(formData)
    } catch (error: unknown) {
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: AssetUploadStatus.Error, error: getErrorMessage(error) }
            : f
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
      .filter((f): f is typeof f & { assetId: string } =>
        f.status === AssetUploadStatus.Success && f.assetId !== undefined,
      )
      .map(f => f.assetId)

    if (onUploadComplete && completedAssetIds.length > 0) {
      onUploadComplete(completedAssetIds)
    }

    setFiles(prev => prev.filter(f => f.status !== AssetUploadStatus.Success))
  }

  const hasUploading = files.some(f => f.status === AssetUploadStatus.Uploading)
  const hasCompleted = files.some(f => f.status === AssetUploadStatus.Success)

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
                {uploadFile.status === AssetUploadStatus.Uploading && (
                  <Loader2 size={14} className="text-blue-500 animate-spin flex-shrink-0" />
                )}
                {uploadFile.status === AssetUploadStatus.Success && (
                  <Check size={14} className="text-green-500 flex-shrink-0" />
                )}
                {uploadFile.status === AssetUploadStatus.Error && (
                  <AlertCircle size={14} className="text-destructive flex-shrink-0" />
                )}
                {uploadFile.status === AssetUploadStatus.Pending && (
                  <Loader2 size={14} className="text-muted-foreground animate-spin flex-shrink-0" />
                )}

                {/* File Info */}
                <div className="flex-1 w-0">
                  <p className="font-medium truncate">{uploadFile.file.name}</p>
                  {uploadFile.status === AssetUploadStatus.Uploading && (
                    <div className="w-full h-1 bg-muted rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-blue-500 transition-all"
                        style={{ width: `${uploadFile.progress}%` }}
                      />
                    </div>
                  )}
                  {uploadFile.status === AssetUploadStatus.Error && uploadFile.error && (
                    <p className="text-destructive text-[10px] mt-0.5">{uploadFile.error}</p>
                  )}
                </div>

                {/* Remove Button */}
                {uploadFile.status !== AssetUploadStatus.Uploading && (
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
