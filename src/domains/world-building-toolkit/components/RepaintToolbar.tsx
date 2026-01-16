import React, { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Paintbrush, Eraser, Check, X, Loader2 } from 'lucide-react'
import { Slider } from '@/components/ui/slider'
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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-background/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-4 flex items-center gap-4 z-50">
      {repaintResult ? (
        <>
          <span className="text-sm font-medium">Review Changes</span>
          <div className="h-6 w-px bg-border/50" />
          <button
            onClick={handleApprove}
            className="flex items-center gap-2 px-4 py-2 bg-green-600/90 text-white rounded-xl text-sm font-medium hover:bg-green-600 shadow-lg shadow-green-900/20 transition-all active:scale-95"
          >
            <Check size={16} /> Approve
          </button>
          <button
            onClick={handleReject}
            className="flex items-center gap-2 px-4 py-2 bg-red-600/90 text-white rounded-xl text-sm font-medium hover:bg-red-600 shadow-lg shadow-red-900/20 transition-all active:scale-95"
          >
            <X size={16} /> Reject
          </button>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 px-2">
            <Paintbrush size={16} className="text-indigo-400" />
            <span className="text-sm font-bold font-syne uppercase tracking-wider text-indigo-100/90">
              Repaint
            </span>
          </div>

          <div className="h-6 w-px bg-border/50" />

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Brush
            </span>
            <Slider
              min={10}
              max={200}
              value={[brushSize]}
              onValueChange={vals => setBrushSize(vals[0])}
              className="w-32"
            />
            <span className="text-xs font-mono text-muted-foreground w-10 text-right">
              {brushSize}px
            </span>
          </div>

          <div className="h-6 w-px bg-border/50" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Prompt
            </span>
            <input
              type="text"
              value={repaintPrompt}
              onChange={e => setRepaintPrompt(e.target.value)}
              placeholder="Describe what to paint..."
              className="w-64 bg-zinc-900/30 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm hover:border-zinc-700 transition-all focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none placeholder:text-muted-foreground/40 shadow-inner"
            />
          </div>

          <div className="h-6 w-px bg-border/50" />

          <button
            onClick={clearRepaintStrokes}
            className="p-2 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            title="Clear Mask"
          >
            <Eraser size={18} />
          </button>

          <div className="h-6 w-px bg-border/50" />

          <button
            onClick={() => setRepaintMode(false)}
            className="px-4 py-2 bg-white/5 border border-border/50 text-foreground/80 rounded-xl text-sm font-medium hover:bg-white/10 transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleGenerate}
            disabled={repaintStrokes.length === 0 || isGenerating}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-indigo-700 shadow-[0_0_15px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Generate
          </button>
        </>
      )}
    </div>
  )
}
