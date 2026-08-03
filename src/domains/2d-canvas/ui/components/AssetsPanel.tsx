import React, { useEffect, useState } from 'react'
import { useWorldStore } from '@/domains/2d-canvas'
import { useWorkspaceProjectStore } from '@/shared/workspace/workspace-project-store'
import { getSupabaseClient } from '@/shared/data/storage/supabaseClient'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import { UrlScheme } from '@/shared/data/constants/protocol'
import { deleteProjectImage } from '@/domains/2d-canvas/core/io/world-data.api'
import { ASSETS_PANEL_COPY } from '@/domains/2d-canvas/ui/constants/assets-panel'
import { Loader2, Trash2, AlertTriangle, Cuboid } from 'lucide-react'
import { Button } from '@/components/Button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import toast from 'react-hot-toast'

interface AssetsPanelProps {
  showHelpText?: boolean
  onSelectAsset?: (url: string, is3D: boolean) => void
}

export const AssetsPanel: React.FC<AssetsPanelProps> = ({ showHelpText = true, onSelectAsset }) => {
  const currentProject = useWorkspaceProjectStore(state => state.currentProject)
  const assets = useWorldStore(state => state.assets)
  const removeAsset = useWorldStore(state => state.removeAsset)
  const previewAssetId = useWorldStore(state => state.previewAssetId)
  const setPreviewAssetId = useWorldStore(state => state.setPreviewAssetId)
  const showAllAssetMasks = useWorldStore(state => state.showAllAssetMasks)
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
      const { error } = await supabase.from(DB_TABLE.ASSETS).delete().eq(DB_COLUMN.ID, assetToDelete.id)
      if (error) throw error

      // Delete file via API
      await deleteProjectImage({
        projectId: currentProject?.id ?? '',
        filename: `assets/${assetToDelete.filename}`,
      })

      // Update local state
      removeAsset(assetToDelete.id)
      toast.success(ASSETS_PANEL_COPY.ASSET_DELETED_TOAST)
    } catch (error: unknown) {
      console.error(ASSETS_PANEL_COPY.ERROR_DELETING_ASSET_LOG, error)
      toast.error(ASSETS_PANEL_COPY.FAILED_DELETE_ASSET_TOAST)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setAssetToDelete(null)
    }
  }

  const handlePreview = (id: string, modelFilename?: string | null) => {
    // Toggle preview - if same asset clicked, turn off preview
    const isSelecting = previewAssetId !== id
    setPreviewAssetId(isSelecting ? id : null)

    if (isSelecting) {
      if (onSelectAsset && modelFilename && currentProject) {
        const glbUrl =
          modelFilename.startsWith(UrlScheme.Http) || modelFilename.startsWith(UrlScheme.Https)
            ? modelFilename
            : `/projects/${currentProject.id}/assets/${modelFilename}`
        onSelectAsset(glbUrl, true)
      }
    }
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
            {assets.map(asset => {
              const has3D = !!asset.model_filename

              const handleDragStart = (e: React.DragEvent) => {
                const thumbnailUrl = asset.image_filename.startsWith('http')
                  ? asset.image_filename
                  : `/projects/${currentProject.id}/assets/${asset.image_filename}`

                const modelFilename = asset.model_filename
                const glbUrl =
                  has3D && modelFilename
                    ? modelFilename.startsWith('http') || modelFilename.startsWith('https')
                      ? modelFilename
                      : `/projects/${currentProject.id}/assets/${modelFilename}`
                    : undefined

                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({
                    type: 'asset',
                    assetId: asset.id,
                    glbUrl: glbUrl,
                    thumbnailUrl: thumbnailUrl,
                    has3D: has3D,
                  })
                )
                e.dataTransfer.effectAllowed = 'copy'
              }

              return (
                <div
                  key={asset.id}
                  draggable={has3D}
                  onDragStart={has3D ? handleDragStart : undefined}
                  className={`relative group aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-all ${has3D ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                    } ${previewAssetId === asset.id
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'border-zinc-800 hover:border-indigo-500/50'
                    }`}
                  onClick={() => handlePreview(asset.id, asset.model_filename)}
                >
                  <img
                    src={asset.image_filename.startsWith('http') ? asset.image_filename : `/projects/${currentProject.id}/assets/${asset.image_filename}`}
                    alt="Asset"
                    draggable={false}
                    className="w-full h-full object-contain bg-[#1a1a1a] pointer-events-none"
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

                  {/* 3D Model indicator */}
                  {asset.model_filename && (
                    <div className="absolute bottom-1 right-1 bg-blue-600/90 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm flex items-center gap-1 backdrop-blur-[2px] z-10 pointer-events-none">
                      <Cuboid size={10} />
                      3D
                    </div>
                  )}

                  {/* 3D Model indicator */}
                  {asset.model_filename && (
                    <div className="absolute bottom-1 right-1 bg-blue-600/90 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm flex items-center gap-1 backdrop-blur-[2px] z-10 pointer-events-none">
                      <Cuboid size={10} />
                      3D
                    </div>
                  )}

                  {/* Show on canvas indicator */}
                  {showAllAssetMasks && asset.metadata?.bounds && (
                    <div className="absolute bottom-1 left-1 bg-green-600 text-white text-[8px] px-1 py-0.5 rounded">
                      ON
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showHelpText && (
        <div className="mt-2 text-[10px] text-muted-foreground font-mono">
          Click asset to preview •{' '}
          {showAllAssetMasks ? 'All masks visible' : 'Click 👁 to show all'}
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
                    src={assetToDelete.filename.startsWith('http') ? assetToDelete.filename : `/projects/${currentProject.id}/assets/${assetToDelete.filename}`}
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
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
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
