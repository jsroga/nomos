import React, { useState, useEffect } from 'react'
import { Image as ImageIcon, Eraser, Save, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Slider } from '@/components/Slider'
import { EditorTool } from '@/shared/types/enums'
import { useAssetEditorImageUpload } from '../state/hooks/useAssetEditorImageUpload'
import { useAssetEditorCanvas } from '../state/hooks/useAssetEditorCanvas'
import { AssetEditorUploadZone } from './AssetEditorUploadZone'
import { AssetPanelCheckerboard } from './AssetPanelEmptyState'
import { AssetExporterPanelClass, AssetExporterPanelCopy } from './constants/asset-exporter-panel'

interface AssetEditorProps {
  assetId: string
  imageUrl: string
  projectId: string
  hasModel?: boolean
  imageFilename?: string
  isPlaceholderImage?: boolean
  onUpdateAsset?: (assetId: string, updates: { image_filename: string }) => void
  onFetchAssets?: () => Promise<void>
}

export const AssetEditor: React.FC<AssetEditorProps> = ({
  assetId,
  imageUrl,
  projectId,
  hasModel,
  imageFilename,
  isPlaceholderImage,
  onUpdateAsset,
  onFetchAssets,
}) => {
  const [tool, setTool] = useState<EditorTool>(EditorTool.None)
  const [brushSize, setBrushSize] = useState(20)
  const [imageLoadError, setImageLoadError] = useState(false)
  const [loadedImageUrl, setLoadedImageUrl] = useState(imageUrl)

  const {
    isDragging,
    isUploading,
    uploadProgress,
    uploadedRealImage,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleFileSelect,
  } = useAssetEditorImageUpload({
    assetId,
    projectId,
    onUpdateAsset,
    onFetchAssets,
    onUploadSuccess: newImageUrl => {
      setLoadedImageUrl(newImageUrl)
      setImageLoadError(false)
    },
  })

  const {
    canvasRef,
    cursorCanvasRef,
    historyIndex,
    isProcessing,
    undo,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    clearCursorOverlay,
    handleSave,
  } = useAssetEditorCanvas({
    assetId,
    projectId,
    assetImageFilename: imageFilename,
    loadedImageUrl,
    uploadedRealImage,
    imageFilename,
    isPlaceholderImage,
    tool,
    brushSize,
    onImageLoadError: setImageLoadError,
    onUpdateAsset,
  })

  const showUploadZone =
    hasModel && !uploadedRealImage && (!imageFilename || imageLoadError || isPlaceholderImage)

  useEffect(() => {
    setLoadedImageUrl(imageUrl)
  }, [imageUrl])

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className={AssetExporterPanelClass.Header}>
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-muted-foreground" />
          <h3 className="font-medium text-sm">{AssetExporterPanelCopy.TwoDEditor}</h3>
        </div>
        {!showUploadZone && (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={undo}
              disabled={historyIndex <= 0}
              title="Undo"
            >
              <RotateCcw size={14} />
            </Button>
            <Button
              variant={tool === EditorTool.Eraser ? 'default' : 'ghost'}
              size="sm"
              onClick={() =>
                setTool(tool === EditorTool.Eraser ? EditorTool.None : EditorTool.Eraser)
              }
              title="Eraser"
            >
              <Eraser size={14} />
            </Button>
            <div className="w-px h-4 bg-border mx-1" />
            <Button
              variant="default"
              size="sm"
              onClick={handleSave}
              disabled={isProcessing}
              className="gap-1"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </Button>
          </div>
        )}
      </div>

      <div className={AssetExporterPanelClass.PreviewStage}>
        <AssetPanelCheckerboard />

        {showUploadZone ? (
          <AssetEditorUploadZone
            isDragging={isDragging}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileSelect={handleFileSelect}
          />
        ) : (
          <div className="relative max-w-full max-h-full">
            <canvas
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={e => {
                if (tool !== EditorTool.None) handleCanvasMouseMove(e)
              }}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => {
                void handleCanvasMouseUp()
                clearCursorOverlay()
              }}
              className={`max-w-full max-h-full object-contain block relative z-10 shadow-lg select-none ${tool !== EditorTool.None ? 'cursor-none' : 'cursor-default'}`}
            />
            <canvas
              ref={cursorCanvasRef}
              className="absolute inset-0 z-20 pointer-events-none max-w-full max-h-full object-contain block"
            />
          </div>
        )}
      </div>

      {!showUploadZone && tool !== EditorTool.None && (
        <div className="p-3 border-t border-border bg-muted/10 flex items-center gap-4">
          <span className="text-xs font-medium w-16">Brush Size: {brushSize}px</span>
          <Slider
            value={[brushSize]}
            min={1}
            max={100}
            step={1}
            onValueChange={([v]) => setBrushSize(v)}
            className="w-48"
          />
        </div>
      )}
    </div>
  )
}
