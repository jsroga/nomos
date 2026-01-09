
'use client'

import React, { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SidebarSection } from '@/components/ui/domain-sidebar'
import { Box, Circle, Cylinder, Cone, RefreshCw, Loader2, Upload, Trash2, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import toast from 'react-hot-toast'

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
]

export const ProjectAssetLibrary: React.FC<ProjectAssetLibraryProps> = ({
    assets,
    currentProjectId,
    activeAssetId,
    onSelectAsset,
    onRefresh,
    isSelectMode = true,
    isLoading = false,
    className
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
        <div className={cn("border-t border-border", className)}>
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

                <ScrollArea className="h-[300px]">
                    <div >
                        {/* Primitives Section */}
                        {onSelectAsset && (
                            <div className="mb-4">
                                <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-muted-foreground mb-2 block">Primitives</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {PRIMITIVES.map(prim => (
                                        <Button
                                            key={prim.id}
                                            variant={activeAssetId === prim.id ? 'default' : 'outline'}
                                            size="sm"
                                            className={cn(
                                                'h-14 flex flex-col gap-1 p-1',
                                                activeAssetId === prim.id && 'border-2 border-primary'
                                            )}
                                            onClick={() => onSelectAsset(prim.id, true)}
                                        >
                                            <prim.icon size={18} />
                                            <span className="text-[10px] font-mono">{prim.name}</span>
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Project Assets Section */}
                        <div>
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-muted-foreground mb-2 block">
                                Project Assets ({assets.length})
                            </span>

                            {!currentProjectId ? (
                                <p className="text-xs text-muted-foreground font-mono">
                                    Select a project to see assets
                                </p>
                            ) : isLoading ? (
                                <div className="flex justify-center p-4">
                                    <Loader2 className="animate-spin w-4 h-4" />
                                </div>
                            ) : assets.length === 0 ? (
                                <div className="text-xs text-muted-foreground font-mono text-center py-4 border border-dashed border-border rounded-lg">
                                    No assets yet.
                                    <br />
                                    <span className="text-[10px]">Upload or Export from World Gen</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {assets.map(asset => {
                                        const modelFilename = asset.model_filename

                                        // Construct full URL for local project assets
                                        const glbUrl = modelFilename
                                            ? (modelFilename.startsWith('http') || modelFilename.startsWith('https')
                                                ? modelFilename
                                                : `/projects/${currentProjectId}/assets/${modelFilename}`)
                                            : undefined

                                        const has3D = !!glbUrl
                                        const assetUrl = glbUrl || `asset:${asset.id}`
                                        const isSelected = activeAssetId === assetUrl

                                        // If image_filename is just a name, prepend path. If url, use as is.
                                        const isAbsUrl = asset.image_filename.startsWith('http')
                                        const thumbnailUrl = isAbsUrl
                                            ? asset.image_filename
                                            : `/projects/${currentProjectId}/assets/${asset.image_filename}`

                                        const handleDragStart = (e: React.DragEvent) => {
                                            // Set drag data for the canvas to use
                                            e.dataTransfer.setData('application/json', JSON.stringify({
                                                type: 'asset',
                                                assetId: asset.id,
                                                glbUrl: glbUrl,
                                                thumbnailUrl: thumbnailUrl,
                                                has3D: has3D,
                                            }))
                                            e.dataTransfer.effectAllowed = 'copy'
                                        }

                                        return (
                                            <div
                                                key={asset.id}
                                                draggable={has3D}
                                                onDragStart={handleDragStart}
                                                className={cn(
                                                    'relative aspect-square bg-muted rounded-lg overflow-hidden border-2 transition-all cursor-grab active:cursor-grabbing',
                                                    isSelected
                                                        ? 'border-primary ring-2 ring-primary/30'
                                                        : 'border-border hover:border-primary/50',
                                                    !has3D && isSelectMode && 'opacity-50 cursor-not-allowed'
                                                )}
                                                onClick={() => {
                                                    if (onSelectAsset && has3D) onSelectAsset(assetUrl, true)
                                                }}
                                            >
                                                <img
                                                    src={thumbnailUrl}
                                                    alt={asset.image_filename}
                                                    className="w-full h-full object-contain bg-[#1a1a1a] pointer-events-none"
                                                    draggable={false}
                                                />
                                                {isSelected && (
                                                    <div className="absolute top-1 left-1 bg-primary text-primary-foreground text-[8px] px-1 py-0.5 rounded font-medium">
                                                        ACTIVE
                                                    </div>
                                                )}
                                                {has3D ? (
                                                    <div className="absolute bottom-1 right-1 bg-green-600 text-white text-[8px] px-1 py-0.5 rounded">
                                                        3D
                                                    </div>
                                                ) : (
                                                    <div className="absolute bottom-1 right-1 bg-gray-600 text-white text-[8px] px-1 py-0.5 rounded">
                                                        2D
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
