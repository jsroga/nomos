'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarSection } from '@/components/ui/domain-sidebar'
import {
  Box,
  Circle,
  Cylinder,
  Cone,
  RefreshCw,
  Loader2,
  Upload,
  Trash2,
  Package,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'
import { LayoutGrid, DoorOpen } from 'lucide-react'

// Types (should match existing usage or be generic)
export interface AssetDisplayItem {
  id: string
  name?: string
  image_filename: string
  model_filename?: string
  project_id?: string
  type?: 'image' | 'model'
}

interface ProjectAssetLibraryProps {
  assets: AssetDisplayItem[]
  currentProjectId?: string
  activeAssetId?: string | null
  onSelectAsset?: (assetId: string, is3D: boolean) => void
  onRefresh?: () => void
  isSelectMode?: boolean // If true, clicking selects. If false, maybe just shows details?
  isLoading?: boolean
  className?: string
}

// Predefined primitive shapes
const PRIMITIVES = [
  { id: 'cube', name: 'Cube', icon: Box },
  { id: 'sphere', name: 'Sphere', icon: Circle },
  { id: 'cylinder', name: 'Cylinder', icon: Cylinder },
  { id: 'cone', name: 'Cone', icon: Cone },
  { id: 'window', name: 'Window', icon: LayoutGrid },
  { id: 'door', name: 'Door', icon: DoorOpen },
]

export const ProjectAssetLibrary: React.FC<ProjectAssetLibraryProps> = ({
  assets,
  currentProjectId,
  activeAssetId,
  onSelectAsset,
  onRefresh,
  isSelectMode = true,
  isLoading = false,
  className,
}) => {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentProjectId) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', currentProjectId)

      const res = await fetch('/api/assets/upload', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        throw new Error('Upload failed')
      }

      // Refresh list
      onRefresh?.()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload asset')
    } finally {
      setIsUploading(false)
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const isPrimitive = (id: string) => PRIMITIVES.some(p => p.id === id)

  return (
    <div className={cn('border-t border-border', className)}>
      <SidebarSection
        title="Asset Library"
        icon={<Package size={12} />}
        rightContent={
          <div className="flex gap-1">
            {/* Upload Button */}
            {currentProjectId && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={handleUploadClick}
                disabled={isUploading || isLoading}
                title="Upload GLB or Image"
              >
                <Upload size={12} />
              </Button>
            )}
            {/* Refresh Button */}
            {onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={onRefresh}
                disabled={isLoading || isUploading}
                title="Refresh List"
              >
                <RefreshCw size={12} className={isLoading || isUploading ? 'animate-spin' : ''} />
              </Button>
            )}
          </div>
        }
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept=".glb,.gltf,.png,.jpg,.jpeg,.webp"
        />

        <ScrollArea className="max-h-[45vh] overflow-y-auto pr-2">
          <div className="space-y-6 pb-4">
            {/* Primitives Section */}
            {onSelectAsset && (
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3 px-1 block">
                  Foundations
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {PRIMITIVES.map(prim => {
                    const isSelected = activeAssetId === prim.id
                    const Icon = prim.icon
                    return (
                      <button
                        key={prim.id}
                        onClick={() => onSelectAsset(prim.id, true)}
                        className={cn(
                          'h-14 flex flex-col items-center justify-center gap-1 rounded-lg border transition-all duration-200 group relative',
                          isSelected
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/30 -translate-y-0.5'
                            : 'bg-zinc-900/50 border-zinc-700/50 text-zinc-400 hover:text-white hover:bg-indigo-600/20 hover:border-indigo-500 hover:-translate-y-0.5'
                        )}
                      >
                        <Icon
                          size={16}
                          className={cn(
                            'transition-all duration-200',
                            isSelected ? 'text-white' : 'text-zinc-500 group-hover:text-indigo-400'
                          )}
                        />
                        <span className="text-[7px] font-semibold uppercase tracking-wide">
                          {prim.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Project Assets Section */}
            <div>
              <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">
                  Catalog ({assets.length})
                </span>
              </div>

              {!currentProjectId ? (
                <div className="p-8 text-center bg-white/3 border border-dashed border-white/5 rounded-2xl">
                  <p className="text-[10px] text-zinc-600 uppercase font-bold tracking-widest">
                    Select project to browse
                  </p>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center p-12 gap-3">
                  <Loader2 className="animate-spin w-5 h-5 text-zinc-500" />
                  <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-600">
                    Loading catalog...
                  </span>
                </div>
              ) : assets.length === 0 ? (
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest text-center py-10 border border-dashed border-white/5 rounded-2xl bg-white/3">
                  No assets.
                  <div className="text-[8px] mt-1 opacity-50">
                    Upload GLB or export from world generator
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {assets.map(asset => {
                    const modelFilename = asset.model_filename
                    const glbUrl = modelFilename
                      ? modelFilename.startsWith('http') || modelFilename.startsWith('https')
                        ? modelFilename
                        : `/projects/${currentProjectId}/assets/${modelFilename}`
                      : undefined

                    const has3D = !!glbUrl
                    const assetUrl = glbUrl || `asset:${asset.id}`
                    const isSelected = activeAssetId === assetUrl

                    const isAbsUrl = asset.image_filename.startsWith('http')
                    const thumbnailUrl = isAbsUrl
                      ? asset.image_filename
                      : `/projects/${currentProjectId}/assets/${asset.image_filename}`

                    const handleDragStart = (e: React.DragEvent) => {
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
                        onDragStart={handleDragStart}
                        className={cn(
                          'relative aspect-square flex flex-col rounded-xl overflow-hidden border transition-all duration-300 group cursor-grab active:cursor-grabbing',
                          isSelected
                            ? 'bg-white/10 border-zinc-100 shadow-xl shadow-white/5 scale-[1.02]'
                            : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10 hover:scale-[1.05]'
                        )}
                        onClick={() => {
                          if (onSelectAsset && has3D) onSelectAsset(assetUrl, true)
                        }}
                      >
                        <div className="flex-1 relative overflow-hidden flex items-center justify-center p-2">
                          <img
                            src={thumbnailUrl}
                            alt={asset.image_filename}
                            className="w-full h-full object-contain pointer-events-none transition-transform duration-500 group-hover:scale-110"
                            draggable={false}
                          />

                          {/* Glow Overlay */}
                          <div
                            className={cn(
                              'absolute inset-0 bg-gradient-to-t from-black/40 to-transparent transition-opacity duration-300',
                              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                            )}
                          />
                        </div>

                        {/* Labels */}
                        <div className="absolute top-1.5 right-1.5 flex gap-1">
                          {has3D && (
                            <div className="bg-emerald-500/80 backdrop-blur-md text-white text-[7px] px-1.5 py-0.5 rounded-full font-bold tracking-tighter">
                              3D
                            </div>
                          )}
                        </div>

                        {isSelected && (
                          <div className="absolute inset-x-1.5 bottom-1.5 bg-zinc-100 rounded-lg py-1 flex items-center justify-center shadow-lg animate-in fade-in slide-in-from-bottom-2">
                            <span className="text-zinc-950 text-[7px] font-black uppercase tracking-widest">
                              Active
                            </span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SidebarSection>
    </div>
  )
}
