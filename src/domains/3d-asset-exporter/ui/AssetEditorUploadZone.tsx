import React, { useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { Button } from '@/components/Button'
import { ASSET_SUPPORTED_IMAGE_EXTENSIONS } from '@/domains/3d-asset-exporter/constants/asset-upload'

interface AssetEditorUploadZoneProps {
  isDragging: boolean
  isUploading: boolean
  uploadProgress: number
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export const AssetEditorUploadZone: React.FC<AssetEditorUploadZoneProps> = ({
  isDragging,
  isUploading,
  uploadProgress,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`
        relative z-10 w-full max-w-md mx-4 border-2 border-dashed rounded-xl p-8 transition-all
        ${
          isDragging
            ? 'border-primary bg-primary/10 scale-[0.98]'
            : 'border-muted-foreground/30 bg-background/5 hover:border-primary/50 hover:bg-background/10'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ASSET_SUPPORTED_IMAGE_EXTENSIONS.join(',')}
        onChange={onFileSelect}
        className="hidden"
      />

      <div className="flex flex-col items-center gap-4 text-center">
        {isUploading ? (
          <>
            <Loader2 size={48} className="text-primary animate-spin" />
            <div className="w-full">
              <p className="text-sm font-medium text-foreground mb-2">Uploading 2D image...</p>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{uploadProgress}%</p>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Upload
                size={32}
                className={isDragging ? 'text-primary' : 'text-muted-foreground opacity-50'}
              />
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-1">Upload 2D Image</h4>
              <p className="text-sm text-muted-foreground mb-1">
                This asset has a 3D model but no 2D preview image
              </p>
              <p className="text-xs text-muted-foreground">
                {isDragging ? 'Drop your image here' : 'Drag & drop or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PNG, JPG, or WebP • Max 50MB</p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 gap-1"
            >
              <Upload size={14} />
              Choose Image
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
