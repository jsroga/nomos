/* eslint-disable */
import React, { useState, useRef, useEffect, DragEvent } from 'react'
import {
  Image as ImageIcon,
  Eraser,
  Paintbrush,
  ArrowUpCircle,
  Save,
  RotateCcw,
  Loader2,
  Upload,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import toast from 'react-hot-toast'
import { repaintService } from '@/domains/world-building-toolkit/services/RepaintService'
import { EditorTool } from '@/types/enums'
import { getErrorMessage } from '@/lib/error-utils'

interface AssetEditorProps {
  assetId: string
  imageUrl: string
  hasModel?: boolean
  imageFilename?: string
  isPlaceholderImage?: boolean
}

export const AssetEditor: React.FC<AssetEditorProps> = ({
  assetId,
  imageUrl,
  hasModel,
  imageFilename,
  isPlaceholderImage,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [tool, setTool] = useState<EditorTool>(EditorTool.None)
  const [brushSize, setBrushSize] = useState(20)
  const [isProcessing, setIsProcessing] = useState(false)
  const [strokes, setStrokes] = useState<Array<{ x: number; y: number }>>([])
  const [history, setHistory] = useState<string[]>([]) // Base64 history
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Image loading state
  const [imageLoadError, setImageLoadError] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const currentProject = useWorldStore(state => state.currentProject)
  const updateAsset = useWorldStore(state => state.updateAsset)
  const fetchAssets = useWorldStore(state => state.fetchAssets)

  // State for loaded image URL (to force re-render after upload)
  const [loadedImageUrl, setLoadedImageUrl] = useState(imageUrl)
  // Local override for isPlaceholderImage after successful upload
  const [uploadedRealImage, setUploadedRealImage] = useState(false)

  // Determine if we should show upload zone
  // Show when: asset has a 3D model AND (no image filename OR image failed to load OR image is a placeholder)
  // But NOT if we just uploaded a real image
  const showUploadZone =
    hasModel && !uploadedRealImage && (!imageFilename || imageLoadError || isPlaceholderImage)

  // Update loadedImageUrl when imageUrl prop changes
  useEffect(() => {
    setLoadedImageUrl(imageUrl)
  }, [imageUrl])

  // Load image onto canvas
  useEffect(() => {
    // Reset error state when imageUrl changes
    setImageLoadError(false)

    // Skip loading if it's a placeholder and we haven't uploaded a real image
    if (!uploadedRealImage && (!imageFilename || isPlaceholderImage)) {
      setImageLoadError(true)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    // Add cache buster to force reload after upload
    img.src = loadedImageUrl + (loadedImageUrl.includes('?') ? '&' : '?') + 't=' + Date.now()
    img.onload = () => {
      setImageLoadError(false)
      canvas.width = img.width
      canvas.height = img.height

      const cursorCanvas = cursorCanvasRef.current
      if (cursorCanvas) {
        cursorCanvas.width = img.width
        cursorCanvas.height = img.height
      }

      ctx.drawImage(img, 0, 0)
      saveState()
    }
    img.onerror = () => {
      setImageLoadError(true)
    }
  }, [loadedImageUrl, imageFilename, isPlaceholderImage, uploadedRealImage])

  const saveState = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = canvas.toDataURL()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(data)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const undo = () => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    loadImageFromData(history[newIndex])
  }

  const loadImageFromData = (data: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.src = data
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

      // Sync cursor canvas size just in case (though it should be matching)
      const cursorCanvas = cursorCanvasRef.current
      if (
        cursorCanvas &&
        (cursorCanvas.width !== canvas.width || cursorCanvas.height !== canvas.height)
      ) {
        cursorCanvas.width = canvas.width
        cursorCanvas.height = canvas.height
      }
    }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Draw Cursor Overlay
    const cursorCanvas = cursorCanvasRef.current
    if (cursorCanvas) {
      const cCtx = cursorCanvas.getContext('2d')
      if (cCtx) {
        cCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height)
        if (tool === EditorTool.Eraser) {
          cCtx.beginPath()
          cCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)'
          cCtx.lineWidth = 1
          cCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
          cCtx.stroke()

          cCtx.beginPath()
          cCtx.strokeStyle = 'rgba(0, 0, 0, 0.6)'
          cCtx.lineWidth = 1
          cCtx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
          cCtx.stroke()
        }
      }
    }

    if (tool === EditorTool.None || !e.buttons) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (tool === EditorTool.Eraser) {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalCompositeOperation = 'source-over'
    } else if (tool === EditorTool.Inpaint) {
      // Just visualize the stroke, we'll collect points for actual inpainting
      ctx.fillStyle = 'rgba(255, 0, 255, 0.5)'
      ctx.beginPath()
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
      ctx.fill()
      setStrokes(prev => [...prev, { x, y }])
    }
  }

  const handleCanvasMouseUp = async () => {
    if (tool === EditorTool.Eraser) {
      saveState()
    } else if (tool === EditorTool.Inpaint && strokes.length > 0) {
      toast.error('Inpainting on single assets not fully implemented yet. Use Eraser.')
      loadImageFromData(history[historyIndex])
      setStrokes([])
    }
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas) return

    setIsProcessing(true)
    try {
      // 1. Upload to server (overwrite asset file)
      const currentProject = useWorldStore.getState().currentProject
      if (!currentProject) return

      const asset = useWorldStore.getState().assets.find(a => a.id === assetId)
      if (!asset) return

      const imageData = canvas.toDataURL('image/png').split(',')[1]

      const response = await fetch('/api/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          filename: `assets/${asset.image_filename}`, // Overwrite existing
          imageData,
        }),
      })

      if (!response.ok) throw new Error('Failed to save')

      toast.success('Asset saved!')
    } catch (e) {
      console.error(e)
      toast.error('Failed to save asset')
    } finally {
      setIsProcessing(false)
    }
  }

  // Upload handlers for 2D image
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
      const file = e.dataTransfer.files[0]
      handleFileUpload(file)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleFileUpload = async (file: File) => {
    if (!currentProject) {
      toast.error('No project selected')
      return
    }

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Please upload a valid image file (PNG, JPG, or WebP)')
      return
    }

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be under 50MB')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', currentProject.id)
      formData.append('assetId', assetId)
      formData.append('updateExisting', 'true')

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', e => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100))
        }
      })

      xhr.addEventListener('load', async () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText)
          toast.success('2D image uploaded successfully!')

          // Update the asset in store
          if (updateAsset && response.imageFilename) {
            updateAsset(assetId, { image_filename: response.imageFilename })
          }

          // Refresh assets list from server
          if (fetchAssets) {
            await fetchAssets()
          }

          // Update the loaded image URL to trigger canvas reload
          const newImageUrl = `/projects/${currentProject.id}/assets/${response.imageFilename}`
          setLoadedImageUrl(newImageUrl)

          // Mark that we uploaded a real image (overrides isPlaceholderImage prop)
          setUploadedRealImage(true)

          // Reset states
          setImageLoadError(false)
          setIsUploading(false)
          setUploadProgress(0)
        } else {
          throw new Error(`Upload failed: ${xhr.statusText}`)
        }
      })

      xhr.addEventListener('error', () => {
        toast.error('Network error during upload')
        setIsUploading(false)
        setUploadProgress(0)
      })

      xhr.open('POST', '/api/assets/upload')
      xhr.send(formData)
    } catch (error: unknown) {
      console.error('Upload error:', error)
      toast.error(`Upload failed: ${getErrorMessage(error)}`)
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-muted-foreground" />
          <h3 className="font-medium text-sm">2D Editor</h3>
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

      <div className="flex-1 bg-[#1a1a1a] relative overflow-hidden flex items-center justify-center">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(45deg, #808080 25%, transparent 25%), linear-gradient(-45deg, #808080 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #808080 75%), linear-gradient(-45deg, transparent 75%, #808080 75%)`,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
          }}
        />

        {showUploadZone ? (
          /* Upload zone when asset has 3D model but no 2D image */
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />

            <div className="flex flex-col items-center gap-4 text-center">
              {isUploading ? (
                <>
                  <Loader2 size={48} className="text-primary animate-spin" />
                  <div className="w-full">
                    <p className="text-sm font-medium text-foreground mb-2">
                      Uploading 2D image...
                    </p>
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
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, or WebP • Max 50MB
                    </p>
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
        ) : (
          /* Normal canvas editor */
          <div className="relative max-w-full max-h-full">
            <canvas
              ref={canvasRef}
              onMouseMove={handleCanvasMouseMove}
              onMouseDown={e => {
                if (tool !== EditorTool.None) handleCanvasMouseMove(e)
              }}
              onMouseUp={handleCanvasMouseUp}
              onMouseLeave={() => {
                handleCanvasMouseUp()
                // Clear cursor
                const cc = cursorCanvasRef.current
                const ctx = cc?.getContext('2d')
                if (cc && ctx) ctx.clearRect(0, 0, cc.width, cc.height)
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
