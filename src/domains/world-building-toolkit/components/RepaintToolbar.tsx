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
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="relative">
        {/* Outer glow */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-indigo-500/30 blur-sm" />

        <div className="relative bg-zinc-950/80 backdrop-blur-2xl border border-indigo-500/25 rounded-2xl shadow-[0_12px_48px_rgba(0,0,0,0.5),0_0_32px_rgba(79,70,229,0.15)] p-4 flex items-center gap-4">
          {/* Top accent line */}
          <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-indigo-400/40 to-transparent" />

          {repaintResult ? (
            <>
              <span className="text-sm font-medium">Review Changes</span>
              <div className="h-6 w-px bg-indigo-500/20" />
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
                <div className="p-1.5 rounded-lg bg-indigo-500/15 ring-1 ring-indigo-400/20">
                  <Paintbrush size={14} className="text-indigo-400" />
                </div>
                <span className="text-sm font-bold font-syne uppercase tracking-wider text-indigo-100/90">
                  Repaint
                </span>
              </div>

              <div className="h-6 w-px bg-indigo-500/20" />

              <div className="flex items-center gap-3 px-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300/60">
                  Brush
                </span>
                <Slider
                  min={10}
                  max={200}
                  value={[brushSize]}
                  onValueChange={vals => setBrushSize(vals[0])}
                  className="w-32"
                />
                <span className="text-xs font-mono text-indigo-300/50 w-10 text-right tabular-nums">
                  {brushSize}px
                </span>
              </div>

              <div className="h-6 w-px bg-indigo-500/20" />

              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-300/60">
                  Prompt
                </span>
                <input
                  type="text"
                  value={repaintPrompt}
                  onChange={e => setRepaintPrompt(e.target.value)}
                  placeholder="Describe what to paint..."
                  className="w-64 bg-white/[0.03] border border-indigo-500/15 rounded-lg px-3 py-1.5 text-sm text-zinc-100 hover:border-indigo-500/25 transition-all focus:border-indigo-400/40 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none placeholder:text-zinc-600 shadow-inner shadow-black/20"
                />
              </div>

              <div className="h-6 w-px bg-indigo-500/20" />

              <button
                onClick={clearRepaintStrokes}
                className="p-2 hover:bg-indigo-500/10 rounded-lg text-zinc-500 hover:text-indigo-300 transition-colors"
                title="Clear Mask"
              >
                <Eraser size={18} />
              </button>

              <div className="h-6 w-px bg-indigo-500/20" />

              <button
                onClick={() => setRepaintMode(false)}
                className="px-4 py-2 bg-white/[0.04] border border-zinc-700/50 text-zinc-400 rounded-xl text-sm font-medium hover:bg-white/[0.08] hover:text-zinc-200 transition-all"
              >
                Cancel
              </button>

              <button
                onClick={handleGenerate}
                disabled={repaintStrokes.length === 0 || isGenerating}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold uppercase tracking-widest hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.5),0_4px_12px_rgba(79,70,229,0.3)] disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed transition-all active:scale-95"
              >
                {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Generate
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
