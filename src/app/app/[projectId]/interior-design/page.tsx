'use client'

import React, { useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'
import { Toolbar } from '@/domains/interior-designer/components/UI/Toolbar'
import { PropertiesPanel } from '@/domains/interior-designer/components/UI/PropertiesPanel'
import { AssetLibrary } from '@/domains/interior-designer/components/UI/AssetLibrary'
import { DesignManager } from '@/domains/interior-designer/components/DesignManager'
import { LayerPanel } from '@/domains/interior-designer/components/UI/LayerPanel'
import { useProjectFromUrl } from '@/hooks/useProjectFromUrl'

// Dynamic import with SSR disabled to avoid React reconciler issues with Three.js
const InteriorCanvas = dynamic(
    () =>
        import('@/domains/interior-designer/components/InteriorCanvas').then(mod => ({
            default: mod.InteriorCanvas,
        })),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex items-center justify-center bg-slate-900">
                <Loader2 className="animate-spin text-muted-foreground" size={48} />
            </div>
        ),
    }
)

import { Button } from '@/components/ui/button'
import { Download, Save, Focus } from 'lucide-react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { debounce } from 'lodash'

export default function InteriorDesignerPage() {
    useProjectFromUrl()

    const setExportRequested = useInteriorStore(state => state.setExportRequested)
    const saveDesign = useInteriorStore(state => state.saveDesign)
    const hasUnsavedChanges = useInteriorStore(state => state.hasUnsavedChanges)
    const isSaving = useInteriorStore(state => state.isSaving)
    const setCameraResetRequested = useInteriorStore(state => state.setCameraResetRequested)
    const addObject = useInteriorStore(state => state.addObject)
    const currentProject = useWorldStore(state => state.currentProject)

    const handleManualSave = async () => {
        if (currentProject?.id) {
            await saveDesign(currentProject.id)
        }
    }

    // Auto-save debounced (2 seconds after last change)
    const debouncedSave = useCallback(
        debounce(() => {
            if (currentProject?.id && hasUnsavedChanges) {
                saveDesign(currentProject.id)
            }
        }, 2000),
        [currentProject?.id]
    )

    useEffect(() => {
        if (hasUnsavedChanges) {
            debouncedSave()
        }
    }, [hasUnsavedChanges, debouncedSave])

    return (
        <div className="w-full h-screen flex flex-col bg-black text-zinc-200 font-sans selection:bg-indigo-500/30">
            {/* Header */}
            <header className="h-14 border-b border-zinc-900 bg-zinc-950 flex items-center px-6 justify-between relative z-50">
                <div className="flex items-center gap-4">
                    <h1 className="font-semibold text-sm tracking-tight text-zinc-100">Scene Builder</h1>
                </div>
                <div className="flex items-center gap-2">
                    {hasUnsavedChanges && !isSaving && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                            Unsaved changes
                        </div>
                    )}
                    {isSaving && <div className="text-xs text-muted-foreground">Saving...</div>}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleManualSave}
                        disabled={!hasUnsavedChanges || !currentProject}
                    >
                        <Save className="w-4 h-4 mr-2" />
                        Save
                    </Button>
                    <DesignManager />
                    <Button size="sm" variant="outline" onClick={() => setCameraResetRequested(true)}>
                        <Focus className="w-4 h-4 mr-2" />
                        Reset View
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setExportRequested(true)}>
                        <Download className="w-4 h-4 mr-2" />
                        Export GLTF
                    </Button>
                    <Button size="sm" variant="outline" onClick={async () => {
                        const { walls, objects } = useInteriorStore.getState()
                        const zipBlob = await import('@/domains/interior-designer/utils/UnityExporter').then(m => m.UnityExporter.createExportZip({ walls, objects }))

                        const url = URL.createObjectURL(zipBlob)
                        const link = document.createElement('a')
                        link.href = url
                        link.download = 'interior-design-unity.zip'
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                    }}>
                        <Download className="w-4 h-4 mr-2" />
                        Export to Unity
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Toolbar (Left) */}
                <div className="w-16 border-r border-zinc-900 bg-zinc-950 z-10 relative">
                    <Toolbar />
                </div>

                {/* 3D Canvas (Center) - with drop handling */}
                <div
                    className="flex-1 relative bg-black"
                    onDragOver={(e) => {
                        e.preventDefault()
                        e.dataTransfer.dropEffect = 'copy'
                    }}
                    onDrop={(e) => {
                        e.preventDefault()
                        try {
                            const data = JSON.parse(e.dataTransfer.getData('application/json'))
                            if (data.type === 'asset' && data.glbUrl) {
                                // Add object at center of canvas (will be repositioned by user)
                                addObject({
                                    modelUrl: data.glbUrl,
                                    position: [0, 0, 0],
                                    rotation: [0, 0, 0],
                                    scale: [1, 1, 1],
                                    isLoading: true,
                                    thumbnailUrl: data.thumbnailUrl,
                                })
                                console.log('Dropped asset:', data)
                            }
                        } catch (err) {
                            console.error('Drop error:', err)
                        }
                    }}
                >
                    <InteriorCanvas />
                </div>

                {/* Layer Panel (Right) */}
                <div className="w-64 border-l border-zinc-900 bg-zinc-950 z-10">
                    <LayerPanel />
                </div>

                {/* Properties Panel (Right) */}
                <div className="w-80 border-l border-zinc-900 bg-zinc-950 z-10 overflow-y-auto flex flex-col">
                    <PropertiesPanel />
                    <AssetLibrary />
                </div>
            </div>
        </div>
    )
}
