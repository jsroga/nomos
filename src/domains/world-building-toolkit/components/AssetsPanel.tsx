import React, { useEffect, useState } from 'react'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { getSupabaseClient } from '@/infrastructure/storage/supabaseClient'
import { Loader2, Trash2, Eye, EyeOff, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import toast from 'react-hot-toast'

interface AssetsPanelProps {
  showHelpText?: boolean
}

export const AssetsPanel: React.FC<AssetsPanelProps> = ({ showHelpText = true }) => {
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

  // Delete confirmation state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; filename: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadAssets = async () => {
    if (!currentProject) return
    setLoading(true)
    await fetchAssets()
    setLoading(false)
  }

  useEffect(() => {
    loadAssets()
  }, [currentProject])

  const handleDeleteClick = (id: string, filename: string) => {
    setAssetToDelete({ id, filename })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return

    setIsDeleting(true)
    try {
      // Delete from DB
      const supabase = getSupabaseClient()
      const { error } = await supabase.from('assets').delete().eq('id', assetToDelete.id)
      if (error) throw error

      // Delete file via API
      await fetch('/api/delete-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: currentProject?.id,
          filename: `assets/${assetToDelete.filename}`,
        }),
      })

      // Update local state
      removeAsset(assetToDelete.id)
      toast.success('Asset deleted')
    } catch (error: any) {
      console.error('Error deleting asset:', error)
      toast.error('Failed to delete asset')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setAssetToDelete(null)
    }
  }

  const handlePreview = (id: string) => {
    // Toggle preview - if same asset clicked, turn off preview
    setPreviewAssetId(previewAssetId === id ? null : id)
  }

  if (!currentProject) return null

  return (
    <div className="w-full">


      <div className="w-full max-h-64 overflow-y-auto">
        {loading && assets.length === 0 ? (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin w-4 h-4" />
          </div>
        ) : assets.length === 0 ? (
          <div className="text-xs text-zinc-500 text-center py-4 border border-dashed border-zinc-800 rounded-lg font-mono bg-zinc-900/30">
            No assets exported yet.
            <br />
            <span className="text-[10px]">Draw a box to select objects</span>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {assets.map(asset => (
              <div
                key={asset.id}
                className={`relative group aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${previewAssetId === asset.id
                  ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                  : 'border-zinc-800 hover:border-indigo-500/50'
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
                  onClick={e => {
                    e.stopPropagation()
                    handleDeleteClick(asset.id, asset.image_filename)
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

      {showHelpText && (
        <div className="mt-2 text-[10px] text-muted-foreground font-mono">
          Click asset to preview • {showAllAssetMasks ? 'All masks visible' : 'Click 👁 to show all'}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Delete Asset
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this asset? This action cannot be undone.
              {assetToDelete && (
                <div className="mt-3 p-2 bg-muted rounded-md">
                  <img
                    src={`/projects/${currentProject.id}/assets/${assetToDelete.filename}`}
                    alt="Asset to delete"
                    className="w-full h-32 object-contain bg-[#1a1a1a] rounded"
                  />
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
