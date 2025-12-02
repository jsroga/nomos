import React, { useEffect } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { supabase } from '@/infrastructure/storage/supabase'
import { Loader2, Trash2, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import toast from 'react-hot-toast'

export const AssetsPanel: React.FC = () => {
    const currentProject = useWorldStore(state => state.currentProject)
    const assets = useWorldStore(state => state.assets)
    const setAssets = useWorldStore(state => state.setAssets)
    const removeAsset = useWorldStore(state => state.removeAsset)
    const previewAssetId = useWorldStore(state => state.previewAssetId)
    const setPreviewAssetId = useWorldStore(state => state.setPreviewAssetId)
    const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)
    const setShowAllAssetMasks = useWorldStore(state => state.setShowAllAssetMasks)
    const fetchAssets = useWorldStore(state => state.fetchAssets)
    const [loading, setLoading] = React.useState(false)

    const loadAssets = async () => {
        if (!currentProject) return
        setLoading(true)
        await fetchAssets()
        setLoading(false)
    }

    useEffect(() => {
        loadAssets()
    }, [currentProject])

    const handleDelete = async (id: string, filename: string) => {
        try {
            // Delete from DB
            const { error } = await supabase.from('assets').delete().eq('id', id)
            if (error) throw error

            // Delete file via API
            await fetch('/api/delete-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: currentProject?.id,
                    filename: `assets/${filename}`
                })
            })

            // Update local state
            removeAsset(id)
            toast.success('Asset deleted')
        } catch (error: any) {
            console.error('Error deleting asset:', error)
            toast.error('Failed to delete asset')
        }
    }

    const handlePreview = (id: string) => {
        // Toggle preview - if same asset clicked, turn off preview
        setPreviewAssetId(previewAssetId === id ? null : id)
    }

    if (!currentProject) return null

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm">Exported Assets ({assets.length})</h3>
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setShowAllAssetMasks(!showAllAssetMasks)}
                        title={showAllAssetMasks ? "Hide all masks" : "Show all masks"}
                    >
                        {showAllAssetMasks ? <EyeOff size={14} /> : <Eye size={14} />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={loadAssets}
                        disabled={loading}
                        title="Refresh"
                    >
                        <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    </Button>
                </div>
            </div>

            <div className="w-full max-h-64 overflow-y-auto">
                {loading && assets.length === 0 ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="animate-spin w-4 h-4" />
                    </div>
                ) : assets.length === 0 ? (
                    <div className="text-xs text-muted-foreground text-center py-4 border border-dashed border-border rounded-lg">
                        No assets exported yet.<br />
                        <span className="text-[10px]">Draw a box to select objects</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-2">
                        {assets.map(asset => (
                            <div 
                                key={asset.id} 
                                className={`relative group aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                                    previewAssetId === asset.id 
                                        ? 'border-primary ring-2 ring-primary/30' 
                                        : 'border-border hover:border-primary/50'
                                }`}
                                onClick={() => handlePreview(asset.id)}
                            >
                                <img
                                    src={`/projects/${currentProject.id}/assets/${asset.image_filename}`}
                                    alt="Asset"
                                    className="w-full h-full object-contain bg-[#1a1a1a]"
                                />
                                
                                {/* Preview indicator */}
                                {previewAssetId === asset.id && (
                                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] px-1 py-0.5 rounded font-medium">
                                        PREVIEW
                                    </div>
                                )}
                                
                                {/* Delete button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        handleDelete(asset.id, asset.image_filename)
                                    }}
                                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    title="Delete asset"
                                >
                                    <Trash2 size={12} />
                                </button>

                                {/* Show on canvas indicator */}
                                {showAllAssetMasks && asset.metadata?.bounds && (
                                    <div className="absolute bottom-1 left-1 bg-green-600 text-white text-[8px] px-1 py-0.5 rounded">
                                        ON
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Help text */}
            <div className="mt-2 text-[10px] text-muted-foreground">
                Click asset to preview • {showAllAssetMasks ? 'All masks visible' : 'Click 👁 to show all'}
            </div>
        </div>
    )
}
