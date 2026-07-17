import { useState, type ChangeEvent, type DragEvent } from 'react'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { FormField } from '@/shared/data/constants/protocol'
import {
  ASSET_UPLOAD_ENDPOINT,
  ASSET_UPLOAD_FILE_SIZE_ERROR,
  ASSET_UPLOAD_FORM_FIELD_FILE,
  ASSET_UPLOAD_FORM_FIELD_PROJECT_ID,
  ASSET_UPLOAD_HTTP_METHOD,
  ASSET_UPLOAD_NETWORK_ERROR,
  AssetUploadXhrEvent,
} from '@/domains/3d-asset-exporter/constants/asset-upload'
import {
  ASSET_EDITOR_IMAGE_MIME_TYPES,
  ASSET_EDITOR_INVALID_IMAGE_TYPE_ERROR,
  ASSET_EDITOR_NO_PROJECT_ERROR,
  ASSET_EDITOR_UPLOAD_ERROR_LOG,
  ASSET_EDITOR_UPLOAD_SUCCESS,
  ASSET_EDITOR_UPLOAD_UPDATE_EXISTING_VALUE,
  AssetUploadResponseField,
} from '@/domains/3d-asset-exporter/constants/asset-editor'

const MAX_FILE_SIZE = 50 * 1024 * 1024

interface UseAssetEditorImageUploadParams {
  assetId: string
  projectId: string | undefined
  onUpdateAsset?: (assetId: string, updates: { image_filename: string }) => void
  onFetchAssets?: () => Promise<void>
  onUploadSuccess: (imageUrl: string) => void
}

function isValidImageMimeType(type: string): boolean {
  return ASSET_EDITOR_IMAGE_MIME_TYPES.some(mimeType => mimeType === type)
}

function getImageFilenameFromUploadResponse(value: unknown): string | null {
  if (typeof value !== 'object' || value === null) return null
  if (!(AssetUploadResponseField.ImageFilename in value)) return null
  const filename = value[AssetUploadResponseField.ImageFilename]
  if (typeof filename !== 'string') return null
  return filename
}

export function useAssetEditorImageUpload({
  assetId,
  projectId,
  onUpdateAsset,
  onFetchAssets,
  onUploadSuccess,
}: UseAssetEditorImageUploadParams) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedRealImage, setUploadedRealImage] = useState(false)

  const handleFileUpload = async (file: File) => {
    if (!projectId) {
      toast.error(ASSET_EDITOR_NO_PROJECT_ERROR)
      return
    }

    if (!isValidImageMimeType(file.type)) {
      toast.error(ASSET_EDITOR_INVALID_IMAGE_TYPE_ERROR)
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error(ASSET_UPLOAD_FILE_SIZE_ERROR)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append(ASSET_UPLOAD_FORM_FIELD_FILE, file)
      formData.append(ASSET_UPLOAD_FORM_FIELD_PROJECT_ID, projectId)
      formData.append(FormField.AssetId, assetId)
      formData.append(FormField.UpdateExisting, ASSET_EDITOR_UPLOAD_UPDATE_EXISTING_VALUE)

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener(AssetUploadXhrEvent.Progress, e => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener(AssetUploadXhrEvent.Load, async () => {
        if (xhr.status === 200) {
          const imageFilename = getImageFilenameFromUploadResponse(JSON.parse(xhr.responseText))
          toast.success(ASSET_EDITOR_UPLOAD_SUCCESS)

          if (onUpdateAsset && imageFilename) {
            onUpdateAsset(assetId, { image_filename: imageFilename })
          }

          if (onFetchAssets) {
            await onFetchAssets()
          }

          const newImageUrl = `/projects/${projectId}/assets/${imageFilename ?? ''}`
          onUploadSuccess(newImageUrl)
          setUploadedRealImage(true)
          setIsUploading(false)
          setUploadProgress(0)
        } else {
          toast.error(`Upload failed: ${xhr.statusText}`)
          setIsUploading(false)
          setUploadProgress(0)
        }
      })

      xhr.addEventListener(AssetUploadXhrEvent.Error, () => {
        toast.error(ASSET_UPLOAD_NETWORK_ERROR)
        setIsUploading(false)
        setUploadProgress(0)
      })

      xhr.open(ASSET_UPLOAD_HTTP_METHOD, ASSET_UPLOAD_ENDPOINT)
      xhr.send(formData)
    } catch (error: unknown) {
      console.error(ASSET_EDITOR_UPLOAD_ERROR_LOG, error)
      toast.error(`Upload failed: ${getErrorMessage(error)}`)
      setIsUploading(false)
      setUploadProgress(0)
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
      void handleFileUpload(e.dataTransfer.files[0])
    }
  }

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFileUpload(e.target.files[0])
    }
  }

  return {
    isDragging,
    isUploading,
    uploadProgress,
    uploadedRealImage,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  }
}
