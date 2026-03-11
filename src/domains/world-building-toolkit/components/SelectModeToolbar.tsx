import { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Square, Check } from 'lucide-react'
import { getSupabaseClient } from '@/infrastructure/storage/supabaseClient'
import { selectModeService } from '@/domains/world-building-toolkit/services/SelectModeService'
import toast from 'react-hot-toast'
import { getErrorMessage } from '@/lib/error-utils'

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
    } catch (error: unknown) {
      console.error('Error saving asset:', error)
      toast.error('Failed to save asset: ' + getErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectMode(false)
    clearSelectBox()
    setSelectedMask(null)
    setSelectTextPrompt('')
  }

  if (!isSelectMode) return null

  return (
    <div className="fixed bottom-8 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-border bg-background/95 px-4 py-3 shadow-2xl">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
        <Square className="h-4 w-4 text-primary" />
      </div>

      <div className="h-8 w-px bg-border/70" />

      {/* Status */}
      <div className="flex min-w-[180px] items-center gap-2 px-1">
        {isSegmenting ? (
          <>
            <Loader2 size={14} className="animate-spin text-primary" />
            <span className="text-xs font-mono text-foreground/90">Segmenting...</span>
          </>
        ) : selectedMask?.imageUrl ? (
          <span className="flex items-center gap-1.5 text-xs font-mono text-green-400">
            <Check size={12} /> Object selected
          </span>
        ) : selectBox ? (
          <span className="text-xs font-mono text-foreground/80">
            Enter prompt...
          </span>
        ) : (
          <span className="text-xs font-mono text-foreground/80">Draw box on map</span>
        )}
      </div>

      <div className="h-8 w-px bg-border/70" />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleCancel}
          className="h-8 border border-border px-4 text-[10px] font-bold uppercase tracking-widest"
        >
          Exit
        </Button>

        {selectedMask && selectedMask.imageUrl && (
          <Button
            size="sm"
            onClick={handleSaveAsset}
            disabled={isSaving}
            className="h-8 px-4 text-[10px] font-bold uppercase tracking-widest shadow-lg shadow-green-900/20 transition-all active:scale-95"
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
