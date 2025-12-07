import React, { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Paintbrush, Eraser, Check, X, Loader2 } from 'lucide-react'
import { repaintService } from '@/domains/world-building-toolkit/services/RepaintService'
import toast from 'react-hot-toast'

export const RepaintToolbar: React.FC = () => {
  const isRepaintMode = useWorldStore(state => state.isRepaintMode)
  const setRepaintMode = useWorldStore(state => state.setRepaintMode)
  const brushSize = useWorldStore(state => state.brushSize)
  const setBrushSize = useWorldStore(state => state.setBrushSize)
  const clearRepaintStrokes = useWorldStore(state => state.clearRepaintStrokes)
  const repaintStrokes = useWorldStore(state => state.repaintStrokes)
  const tiles = useWorldStore(state => state.tiles)
  const setRepaintResult = useWorldStore(state => state.setRepaintResult)
  const repaintResult = useWorldStore(state => state.repaintResult)

  const [isGenerating, setIsGenerating] = useState(false)

  if (!isRepaintMode) return null

  const handleGenerate = async () => {
    if (repaintStrokes.length === 0) return
    setIsGenerating(true)
    try {
      const result = await repaintService.generateRepaint(repaintStrokes, tiles, brushSize)
      setRepaintResult(result)
      toast.success('Repaint generated! Review the result.')
    } catch (error) {
      console.error(error)
      toast.error('Repaint generation failed')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleApprove = async () => {
    if (!repaintResult) return
    await repaintService.applyRepaint(repaintResult)
    toast.success('Changes applied!')
    setRepaintResult(null)
    clearRepaintStrokes()
    setRepaintMode(false)
  }

  const handleReject = () => {
    setRepaintResult(null)
    toast('Changes discarded')
  }

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-lg p-4 flex items-center gap-4 z-50">
      {repaintResult ? (
        <>
          <span className="text-sm font-medium">Review Changes</span>
          <div className="h-6 w-px bg-border" />
          <button
            onClick={handleApprove}
            className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
          >
            <Check size={16} /> Approve
          </button>
          <button
            onClick={handleReject}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
          >
            <X size={16} /> Reject
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <Paintbrush size={16} />
            <span className="text-sm font-medium">Repaint Mode</span>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Size</span>
            <input
              type="range"
              min="10"
              max="200"
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              className="w-32"
            />
            <span className="text-xs w-8">{brushSize}px</span>
          </div>

          <div className="h-6 w-px bg-border" />

          <button
            onClick={clearRepaintStrokes}
            className="p-2 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground"
            title="Clear Mask"
          >
            <Eraser size={16} />
          </button>

          <div className="h-6 w-px bg-border" />

          <button
            onClick={() => setRepaintMode(false)}
            className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm font-medium hover:bg-secondary/90"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={repaintStrokes.length === 0 || isGenerating}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : null}
            Generate
          </button>
        </>
      )}
    </div>
  )
}
