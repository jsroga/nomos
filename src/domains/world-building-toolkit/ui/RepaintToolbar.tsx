import React, { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit'
import { Paintbrush, Eraser, Check, X, Loader2 } from 'lucide-react'
import { Slider } from '@/components/Slider'
import { repaintService } from '@/domains/world-building-toolkit/state/client-services/RepaintService'
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
  const repaintPrompt = useWorldStore(state => state.repaintPrompt)
  const setRepaintPrompt = useWorldStore(state => state.setRepaintPrompt)
  const currentProject = useWorldStore(state => state.currentProject)

  const [isGenerating, setIsGenerating] = useState(false)
  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])

  // Load style references when project changes
  React.useEffect(() => {
    if (currentProject?.id) {
      fetch(`/api/storyteller/projects/${currentProject.id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.styleReferenceUrls) {
            setStyleReferenceUrls(data.styleReferenceUrls)
          }
        })
        .catch(err => console.error('Failed to load project style refs:', err))
    }
  }, [currentProject?.id])

  if (!isRepaintMode) return null

  const handleGenerate = async () => {
    if (repaintStrokes.length === 0) return
    setIsGenerating(true)
    try {
      const result = await repaintService.generateRepaint(
        repaintStrokes,
        tiles,
        brushSize,
        repaintPrompt,
        styleReferenceUrls
      )
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
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-2xl">

        {/* Icon */}
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
          <Paintbrush className="h-4 w-4 text-primary" />
        </div>

        <div className="h-8 w-px bg-border/70" />

        {repaintResult ? (
          <>
            <span className="text-xs font-mono text-foreground/80 min-w-[100px]">Review changes</span>
            <div className="h-8 w-px bg-border/70" />
            <div className="flex items-center gap-2">
              <button
                onClick={handleApprove}
                className="flex items-center gap-1.5 h-8 px-4 rounded-xl bg-green-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-green-500 shadow-lg shadow-green-900/20 transition-all active:scale-95"
              >
                <Check size={14} /> Approve
              </button>
              <button
                onClick={handleReject}
                className="flex items-center gap-1.5 h-8 px-4 rounded-xl border border-border text-[10px] font-bold uppercase tracking-widest text-foreground/80 hover:bg-accent transition-all active:scale-95"
              >
                <X size={14} /> Reject
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Brush size */}
            <div className="flex items-center gap-2.5">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Brush</span>
              <Slider
                min={10}
                max={200}
                value={[brushSize]}
                onValueChange={vals => setBrushSize(vals[0])}
                className="w-28"
              />
              <span className="text-xs font-mono text-muted-foreground w-9 text-right tabular-nums">{brushSize}px</span>
            </div>

            <div className="h-8 w-px bg-border/70" />

            {/* Prompt */}
            <input
              type="text"
              value={repaintPrompt}
              onChange={e => setRepaintPrompt(e.target.value)}
              placeholder="Describe what to paint..."
              className="w-56 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />

            <div className="h-8 w-px bg-border/70" />

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={clearRepaintStrokes}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-muted-foreground hover:border-border hover:bg-accent hover:text-foreground transition-colors"
                title="Clear mask"
              >
                <Eraser size={16} />
              </button>

              <button
                onClick={() => setRepaintMode(false)}
                className="h-8 border border-border px-4 rounded-xl text-[10px] font-bold uppercase tracking-widest text-foreground/80 hover:bg-accent transition-colors"
              >
                Exit
              </button>

              <button
                onClick={handleGenerate}
                disabled={repaintStrokes.length === 0 || isGenerating}
                className="flex items-center gap-1.5 h-8 px-5 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition-all active:scale-95"
              >
                {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Generate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
