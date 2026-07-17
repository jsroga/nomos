import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { EditorTool } from '@/shared/types/enums'
import { saveAssetImage } from '@/domains/3d-asset-exporter/core/io/asset-exporter.api'
import {
  ASSET_EDITOR_ASSETS_PATH_PREFIX,
  ASSET_EDITOR_CACHE_BUSTER_PARAM,
  ASSET_EDITOR_ERASER_CURSOR_STROKE_INNER,
  ASSET_EDITOR_ERASER_CURSOR_STROKE_OUTER,
  ASSET_EDITOR_INPAINT_NOT_IMPLEMENTED,
  ASSET_EDITOR_INPAINT_STROKE_FILL,
  ASSET_EDITOR_SAVE_FAILED,
  ASSET_EDITOR_SAVE_IMAGE_FORMAT,
  ASSET_EDITOR_SAVE_SUCCESS,
  CanvasCompositeOperation,
  CanvasContextId,
  ImageCrossOrigin,
} from '@/domains/3d-asset-exporter/constants/asset-editor'

interface UseAssetEditorCanvasParams {
  projectId: string | undefined
  assetImageFilename: string | undefined
  loadedImageUrl: string
  uploadedRealImage: boolean
  imageFilename?: string
  isPlaceholderImage?: boolean
  tool: EditorTool
  brushSize: number
  onImageLoadError: (hasError: boolean) => void
}

export function useAssetEditorCanvas({
  projectId,
  assetImageFilename,
  loadedImageUrl,
  uploadedRealImage,
  imageFilename,
  isPlaceholderImage,
  tool,
  brushSize,
  onImageLoadError,
}: UseAssetEditorCanvasParams) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [strokes, setStrokes] = useState<Array<{ x: number; y: number }>>([])
  const [history, setHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  const saveState = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const data = canvas.toDataURL()
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(data)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const loadImageFromData = (data: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext(CanvasContextId.TwoD)
    if (!ctx) return

    const img = new Image()
    img.src = data
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)

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

  const undo = () => {
    if (historyIndex <= 0) return
    const newIndex = historyIndex - 1
    setHistoryIndex(newIndex)
    loadImageFromData(history[newIndex])
  }

  useEffect(() => {
    onImageLoadError(false)

    if (!uploadedRealImage && (!imageFilename || isPlaceholderImage)) {
      onImageLoadError(true)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext(CanvasContextId.TwoD)
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = ImageCrossOrigin.Anonymous
    img.src =
      loadedImageUrl +
      (loadedImageUrl.includes('?') ? '&' : '?') +
      ASSET_EDITOR_CACHE_BUSTER_PARAM +
      Date.now()
    img.onload = () => {
      onImageLoadError(false)
      canvas.width = img.width
      canvas.height = img.height

      const cursorCanvas = cursorCanvasRef.current
      if (cursorCanvas) {
        cursorCanvas.width = img.width
        cursorCanvas.height = img.height
      }

      ctx.drawImage(img, 0, 0)
      const data = canvas.toDataURL()
      setHistory([data])
      setHistoryIndex(0)
    }
    img.onerror = () => {
      onImageLoadError(true)
    }
  }, [loadedImageUrl, imageFilename, isPlaceholderImage, uploadedRealImage, onImageLoadError])

  const drawEraserCursor = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.beginPath()
    ctx.strokeStyle = ASSET_EDITOR_ERASER_CURSOR_STROKE_OUTER
    ctx.lineWidth = 1
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.strokeStyle = ASSET_EDITOR_ERASER_CURSOR_STROKE_INNER
    ctx.lineWidth = 1
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.stroke()
  }

  const applyEraserStroke = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.globalCompositeOperation = CanvasCompositeOperation.DestinationOut
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalCompositeOperation = CanvasCompositeOperation.SourceOver
  }

  const applyInpaintStroke = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    ctx.fillStyle = ASSET_EDITOR_INPAINT_STROKE_FILL
    ctx.beginPath()
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2)
    ctx.fill()
    setStrokes(prev => [...prev, { x, y }])
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height

    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    const cursorCanvas = cursorCanvasRef.current
    if (cursorCanvas) {
      const cCtx = cursorCanvas.getContext(CanvasContextId.TwoD)
      if (cCtx) {
        cCtx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height)
        if (tool === EditorTool.Eraser) {
          drawEraserCursor(cCtx, x, y)
        }
      }
    }

    if (tool === EditorTool.None || !e.buttons) return

    const ctx = canvas.getContext(CanvasContextId.TwoD)
    if (!ctx) return

    if (tool === EditorTool.Eraser) {
      applyEraserStroke(ctx, x, y)
    } else if (tool === EditorTool.Inpaint) {
      applyInpaintStroke(ctx, x, y)
    }
  }

  const handleCanvasMouseUp = async () => {
    if (tool === EditorTool.Eraser) {
      saveState()
    } else if (tool === EditorTool.Inpaint && strokes.length > 0) {
      toast.error(ASSET_EDITOR_INPAINT_NOT_IMPLEMENTED)
      loadImageFromData(history[historyIndex])
      setStrokes([])
    }
  }

  const clearCursorOverlay = () => {
    const cursorCanvas = cursorCanvasRef.current
    const ctx = cursorCanvas?.getContext(CanvasContextId.TwoD)
    if (cursorCanvas && ctx) {
      ctx.clearRect(0, 0, cursorCanvas.width, cursorCanvas.height)
    }
  }

  const handleSave = async () => {
    const canvas = canvasRef.current
    if (!canvas || !projectId || !assetImageFilename) return

    setIsProcessing(true)
    try {
      const imageData = canvas.toDataURL(ASSET_EDITOR_SAVE_IMAGE_FORMAT).split(',')[1]

      await saveAssetImage({
        projectId,
        filename: `${ASSET_EDITOR_ASSETS_PATH_PREFIX}${assetImageFilename}`,
        imageData,
      })

      toast.success(ASSET_EDITOR_SAVE_SUCCESS)
    } catch (e) {
      console.error(e)
      toast.error(ASSET_EDITOR_SAVE_FAILED)
    } finally {
      setIsProcessing(false)
    }
  }

  return {
    canvasRef,
    cursorCanvasRef,
    historyIndex,
    isProcessing,
    undo,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
    clearCursorOverlay,
    handleSave,
  }
}
