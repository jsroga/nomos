import React, { useState } from 'react'
import { useWorldStore } from '@/domains/2d-canvas'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { Paintbrush, Eraser, Check, Loader2 } from 'lucide-react'
import { Slider } from '@/components/Slider'
import { KeyboardKey } from '@/shared/data/constants/protocol'
import { repaintService } from '@/domains/2d-canvas/state/client-services/repaint-service'
import toast from 'react-hot-toast'
import { settingsApi } from '@/domains/2d-canvas/core/io/settings.api'
import {
  REPAINT_GENERATED_TOAST,
  REPAINT_GENERATION_FAILED_TOAST,
  REPAINT_STYLE_REFS_FAILED_LOG,
} from '@/domains/2d-canvas/ui/constants/repaint-toolbar'

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
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)

  const [isGenerating, setIsGenerating] = useState(false)
  const [styleReferenceUrls, setStyleReferenceUrls] = useState<string[]>([])

  React.useEffect(() => {
    if (currentProject?.id) {
      void (async () => {
        try {
          const data = await settingsApi.fetchProject(currentProject.id)
          if (data.styleReferenceUrls?.length) {
            setStyleReferenceUrls(data.styleReferenceUrls)
          }
        } catch (err) {
          console.error(REPAINT_STYLE_REFS_FAILED_LOG, err)
        }
      })()
    }
  }, [currentProject?.id])

  if (!isRepaintMode || repaintResult) return null

  const handleGenerate = async () => {
    if (repaintStrokes.length === 0 || isGenerating) return
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
      toast.success(REPAINT_GENERATED_TOAST)
    } catch (error) {
      console.error(error)
      toast.error(REPAINT_GENERATION_FAILED_TOAST)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-4 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-2xl">

        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
          <Paintbrush className="h-4 w-4 text-primary" />
        </div>

        <div className="h-8 w-px bg-border/70" />

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

        <input
          type="text"
          value={repaintPrompt}
          onChange={e => setRepaintPrompt(e.target.value)}
          onKeyDown={event => {
            if (event.key !== KeyboardKey.Enter) return
            event.preventDefault()
            void handleGenerate()
          }}
          placeholder="Describe what to paint..."
          className="w-56 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
        />

        <div className="h-8 w-px bg-border/70" />

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
            onClick={() => {
              void handleGenerate()
            }}
            disabled={repaintStrokes.length === 0 || isGenerating}
            className="flex items-center gap-1.5 h-8 px-5 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg transition-all active:scale-95"
          >
            {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            Generate
          </button>
        </div>
      </div>
    </div>
  )
}
