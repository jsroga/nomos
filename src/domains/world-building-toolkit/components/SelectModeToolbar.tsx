import { useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Button } from '@/components/ui/button'
import { Loader2, Save, Trash2, Square } from 'lucide-react'
import { supabase } from '@/infrastructure/storage/supabase'
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
            const { dataUrl: extractedAsset, bounds: actualBounds } = await selectModeService.extractAsset(
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
            const { data: newAsset, error } = await supabase
                .from('assets')
                .insert({
                    project_id: currentProject.id,
                    image_filename: filename,
                    metadata: {
                        bounds: actualBounds,  // Use the actual cropped bounds
                        box: selectBox
                    }
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
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-card border border-border rounded-xl shadow-2xl p-3 flex items-center gap-3 z-50">
            {/* Mode indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-lg">
                <Square className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-primary">
                    Select Mode
                </span>
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Status */}
            <div className="flex items-center gap-2 min-w-[140px]">
                {isSegmenting ? (
                    <>
                        <Loader2 size={14} className="animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">Segmenting...</span>
                    </>
                ) : selectedMask?.imageUrl ? (
                    <span className="text-xs text-green-600 font-medium">✓ Object selected</span>
                ) : selectBox ? (
                    <span className="text-xs text-muted-foreground">Enter prompt...</span>
                ) : (
                    <span className="text-xs text-muted-foreground">Draw a box to select</span>
                )}
            </div>

            <div className="w-px h-6 bg-border" />

            {/* Actions */}
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    disabled={!selectBox && !selectedMask}
                    className="h-8 px-2 text-xs"
                >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Clear
                </Button>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCancel}
                    className="h-8 px-3 text-xs"
                >
                    Exit
                </Button>

                {selectedMask && selectedMask.imageUrl && (
                    <Button
                        size="sm"
                        onClick={handleSaveAsset}
                        disabled={isSaving}
                        className="h-8 px-3 text-xs bg-green-600 hover:bg-green-700 text-white"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={14} className="animate-spin mr-1" /> Saving...
                            </>
                        ) : (
                            <>
                                <Save size={14} className="mr-1" /> Save Asset
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    )
}
