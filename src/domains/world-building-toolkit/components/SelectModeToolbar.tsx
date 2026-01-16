import { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Trash2, Square, Check } from 'lucide-react'
import { getSupabaseClient } from '@/infrastructure/storage/supabaseClient'
import { selectModeService } from '@/domains/world-building-toolkit/services/SelectModeService'
import toast from 'react-hot-toast'

export const SelectModeToolbar: React.FC = () => {
  const isSelectMode = useWorldStore(state => state.isSelectMode)
  const setSelectMode = useWorldStore(state => state.setSelectMode)
  const selectBox = useWorldStore(state => state.selectBox)
  const clearSelectBox = useWorldStore(state => state.clearSelectBox)
  const selectedMask = useWorldStore(state => state.selectedMask)
  const setSelectedMask = useWorldStore(state => state.setSelectedMask)
  const currentProject = useWorldStore(state => state.currentProject)
  const isSegmenting = useWorldStore(state => state.isSegmenting)
  const setSelectTextPrompt = useWorldStore(state => state.setSelectTextPrompt)
  const addAsset = useWorldStore(state => state.addAsset)
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveAsset = async () => {
    if (!selectedMask || !currentProject || !selectedMask.debugInfo?.contextImage) return

    setIsSaving(true)
    const filename = `asset_${Date.now()}.png`

    try {
      // 1. Extract the segmented object with transparent background
      // Pass the original bounds so we can calculate the actual world position
      const { dataUrl: extractedAsset, bounds: actualBounds } =
        await selectModeService.extractAsset(
          selectedMask.debugInfo.contextImage,
          selectedMask.imageUrl,
          selectedMask.bounds
        )

      // 2. Save Image Locally
      const response = await fetch('/api/save-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject.id,
          filename: `assets/${filename}`,
          imageData: extractedAsset,
        }),
      })

      if (!response.ok) throw new Error('Failed to save asset image')

      // 3. Save Metadata to Supabase with the actual cropped bounds
      const supabase = getSupabaseClient()
      const { data: newAsset, error } = await supabase
        .from('assets')
        .insert({
          project_id: currentProject.id,
          image_filename: filename,
          metadata: {
            bounds: actualBounds, // Use the actual cropped bounds
            box: selectBox,
          },
        })
        .select()
        .single()

      if (error) throw error

      // 4. Add to local state immediately (no refresh needed)
      if (newAsset) {
        addAsset(newAsset)
      }

      toast.success('Asset saved!')
      setSelectedMask(null)
      clearSelectBox()
    } catch (error: any) {
      console.error('Error saving asset:', error)
      toast.error('Failed to save asset: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = () => {
    clearSelectBox()
    setSelectedMask(null)
  }

  const handleCancel = () => {
    setSelectMode(false)
    clearSelectBox()
    setSelectedMask(null)
    setSelectTextPrompt('')
  }

  if (!isSelectMode) return null

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-background/60 backdrop-blur-xl border border-border/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3 flex items-center gap-3 z-50">
      {/* Mode indicator */}
      <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
        <Square className="w-4 h-4 text-indigo-400" />
        <span className="text-xs font-bold font-syne uppercase tracking-wider text-indigo-100/90">
          Select
        </span>
      </div>

      <div className="w-px h-6 bg-border/50" />

      {/* Status */}
      <div className="flex items-center gap-2 min-w-[140px] px-2">
        {isSegmenting ? (
          <>
            <Loader2 size={14} className="animate-spin text-indigo-400" />
            <span className="text-xs text-muted-foreground font-mono">Segmenting...</span>
          </>
        ) : selectedMask?.imageUrl ? (
          <span className="text-xs text-green-400 font-mono flex items-center gap-1.5">
            <Check size={12} /> Object selected
          </span>
        ) : selectBox ? (
          <span className="text-xs text-muted-foreground font-mono animate-pulse">
            Enter prompt...
          </span>
        ) : (
          <span className="text-xs text-muted-foreground font-mono">Draw box on map</span>
        )}
      </div>

      <div className="w-px h-6 bg-border/50" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={!selectBox && !selectedMask}
          className="h-8 px-3 text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground hover:bg-white/5"
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5 opacity-70" />
          Clear
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={handleCancel}
          className="h-8 px-4 text-[10px] uppercase tracking-widest font-bold bg-white/5 border border-border/50 hover:bg-white/10"
        >
          Exit
        </Button>

        {selectedMask && selectedMask.imageUrl && (
          <Button
            size="sm"
            onClick={handleSaveAsset}
            disabled={isSaving}
            className="h-8 px-4 text-[10px] uppercase tracking-widest font-bold bg-green-600/90 hover:bg-green-600 text-white shadow-lg shadow-green-900/20 transition-all active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin mr-1.5" /> Saving
              </>
            ) : (
              <>
                <Save size={14} className="mr-1.5" /> Save Asset
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
