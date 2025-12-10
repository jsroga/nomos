/* eslint-disable */
import React, { useState, useRef, useEffect } from 'react'
import {
  Image as ImageIcon,
  Eraser,
  Paintbrush,
  ArrowUpCircle,
  Save,
  RotateCcw,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import toast from 'react-hot-toast'
import { repaintService } from '@/domains/world-building-toolkit/services/RepaintService'
import { EditorTool } from '@/types/enums'

interface AssetEditorProps {
  assetId: string
  imageUrl: string
}

export const AssetEditor: React.FC<AssetEditorProps> = ({ assetId, imageUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const cursorCanvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<EditorTool>(EditorTool.None)
  const [brushSize, setBrushSize] = useState(20)
  const [isProcessing, setIsProcessing] = useState(false)
  const [strokes, setStrokes] = useState<Array<{ x: number; y: number }>>([])
  const [history, setHistory] = useState<string[]>([]) // Base64 history
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = imageUrl
    img.onload = () => {
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
  }, [imageUrl])

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
      if (cursorCanvas && (cursorCanvas.width !== canvas.width || cursorCanvas.height !== canvas.height)) {
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

  return (
    <div className="flex flex-col h-full bg-card border border-border rounded-lg overflow-hidden shadow-sm">
      <div className="p-3 border-b border-border flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-2">
          <ImageIcon size={16} className="text-muted-foreground" />
          <h3 className="font-medium text-sm">2D Editor</h3>
        </div>
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
      </div>

      {tool !== EditorTool.None && (
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
