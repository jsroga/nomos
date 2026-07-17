'use client'

import React, { useState } from 'react'
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
import { getSupabaseClient } from '@/shared/data/storage/supabaseClient'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import toast from 'react-hot-toast'
import {
  deleteProjectAssetImage,
  resolveProjectAssetUrl,
  type WorkspaceAsset,
} from '@/shared/workspace/io/project-assets-api'
import { useProjectAssets } from '@/shared/workspace/hooks/useProjectAssets'

const ASSET_DELETED_TOAST = 'Asset deleted'
const DELETE_ASSET_ERROR_LOG = 'Error deleting asset:'
const DELETE_ASSET_FAILED_TOAST = 'Failed to delete asset'

interface ProjectAssetsPanelProps {
  projectId: string
  showHelpText?: boolean
  onSelectAsset?: (url: string, is3D: boolean) => void
}

export const ProjectAssetsPanel: React.FC<ProjectAssetsPanelProps> = ({
  projectId,
  showHelpText = true,
  onSelectAsset,
}) => {
  const { assets, loading, refetch } = useProjectAssets(projectId)
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<{ id: string; filename: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (id: string, filename: string) => {
    setAssetToDelete({ id, filename })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!assetToDelete) return

    setIsDeleting(true)
    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.from(DB_TABLE.ASSETS).delete().eq(DB_COLUMN.ID, assetToDelete.id)
      if (error) throw error

      await deleteProjectAssetImage(projectId, assetToDelete.filename)

      await refetch()
      toast.success(ASSET_DELETED_TOAST)
    } catch (error: unknown) {
      console.error(DELETE_ASSET_ERROR_LOG, error)
      toast.error(DELETE_ASSET_FAILED_TOAST)
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setAssetToDelete(null)
    }
  }

  const handlePreview = (asset: WorkspaceAsset) => {
    const isSelecting = previewAssetId !== asset.id
    setPreviewAssetId(isSelecting ? asset.id : null)

    if (isSelecting && onSelectAsset && asset.modelFilename) {
      onSelectAsset(resolveProjectAssetUrl(projectId, asset.modelFilename), true)
    }
  }

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
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {assets.map(asset => {
              const has3D = !!asset.modelFilename
              const thumbnailUrl = resolveProjectAssetUrl(projectId, asset.imageFilename)

              const handleDragStart = (e: React.DragEvent) => {
                const glbUrl = has3D && asset.modelFilename
                  ? resolveProjectAssetUrl(projectId, asset.modelFilename)
                  : undefined

                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({
                    type: 'asset',
                    assetId: asset.id,
                    glbUrl,
                    thumbnailUrl,
                    has3D,
                  })
                )
                e.dataTransfer.effectAllowed = 'copy'
              }

              return (
                <div
                  key={asset.id}
                  draggable={has3D}
                  onDragStart={has3D ? handleDragStart : undefined}
                  className={`relative group aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-all ${
                    has3D ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                  } ${
                    previewAssetId === asset.id
                      ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                      : 'border-zinc-800 hover:border-indigo-500/50'
                  }`}
                  onClick={() => handlePreview(asset)}
                >
                  <img
                    src={thumbnailUrl}
                    alt="Asset"
                    draggable={false}
                    className="w-full h-full object-contain bg-[#1a1a1a] pointer-events-none"
                  />

                  {previewAssetId === asset.id && (
                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] px-1 py-0.5 rounded font-medium">
                      PREVIEW
                    </div>
                  )}

                  <button
                    onClick={e => {
                      e.stopPropagation()
                      handleDeleteClick(asset.id, asset.imageFilename)
                    }}
                    className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Delete asset"
                  >
                    <Trash2 size={12} />
                  </button>

                  {asset.modelFilename && (
                    <div className="absolute bottom-1 right-1 bg-blue-600/90 text-white text-[9px] px-1.5 py-0.5 rounded font-bold shadow-sm flex items-center gap-1 backdrop-blur-[2px] z-10 pointer-events-none">
                      <Cuboid size={10} />
                      3D
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
          Click asset to preview
        </div>
      )}

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
                    src={resolveProjectAssetUrl(projectId, assetToDelete.filename)}
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
