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

import { cn } from '@/lib/utils'
import { TOUR_STEP_IDS } from '@/lib/tour-constants'

import { DomainSidebar } from '@/components/ui/domain-sidebar'

export default function InteriorDesignerPage() {
  useProjectFromUrl()

  const setExportRequested = useInteriorStore(state => state.setExportRequested)
  const saveDesign = useInteriorStore(state => state.saveDesign)
  const hasUnsavedChanges = useInteriorStore(state => state.hasUnsavedChanges)
  const isSaving = useInteriorStore(state => state.isSaving)
  const setCameraResetRequested = useInteriorStore(state => state.setCameraResetRequested)
  const addObject = useInteriorStore(state => state.addObject)
  const mode = useInteriorStore(state => state.mode)
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

  const zenMode = useInteriorStore(state => state.zenMode)
  const toggleZenMode = useInteriorStore(state => state.toggleZenMode)

  // keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault()
        toggleZenMode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [toggleZenMode])

  return (
    <div className="w-full h-screen flex flex-col bg-black text-zinc-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
      {/* Header - Aligned with other modules */}
      <header
        className={cn(
          'h-14 border-b border-border/50 bg-zinc-950/50 backdrop-blur-md flex items-center px-6 justify-between relative z-50 transition-all duration-500',
          zenMode && '-translate-y-full opacity-0'
        )}
      >
        <div className="flex items-center gap-4">
          <h1 className="font-mono font-bold text-sm tracking-widest text-zinc-100 uppercase">
            Interior Designer
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {hasUnsavedChanges && !isSaving && (
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-yellow-500/80 flex items-center gap-1.5 mr-2">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.5)]" />
              Unsaved
            </div>
          )}
          {isSaving && (
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo-400 animate-pulse mr-2">
              Saving...
            </div>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-white/5 font-mono text-[10px] uppercase tracking-widest"
            onClick={handleManualSave}
            disabled={!hasUnsavedChanges || !currentProject}
          >
            <Save className="w-3.5 h-3.5 mr-2" />
            Save
          </Button>
          <DesignManager />
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-white/5 font-mono text-[10px] uppercase tracking-widest"
            onClick={() => setCameraResetRequested(true)}
          >
            <Focus className="w-3.5 h-3.5 mr-2" />
            Reset View
          </Button>
          <div id={TOUR_STEP_IDS.INTERIOR_EXPORT} className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              className="hover:bg-white/5 font-mono text-[10px] uppercase tracking-widest"
              onClick={() => setExportRequested(true)}
            >
              <Download className="w-3.5 h-3.5 mr-2 text-indigo-400" />
              GLTF
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="hover:bg-white/5 font-mono text-[10px] uppercase tracking-widest border border-indigo-500/20"
              onClick={async () => {
                const { walls, objects } = useInteriorStore.getState()
                const zipBlob =
                  await import('@/domains/interior-designer/utils/UnityExporter').then(m =>
                    m.UnityExporter.createExportZip({ walls, objects })
                  )

                const url = URL.createObjectURL(zipBlob)
                const link = document.createElement('a')
                link.href = url
                link.download = 'interior-design-unity.zip'
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
              }}
            >
              <Download className="w-3.5 h-3.5 mr-2 text-indigo-400" />
              Unity
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Sidebar: Toolbar */}
        <div
          className={cn(
            'transition-all duration-700 ease-in-out h-full',
            zenMode ? '-translate-x-full opacity-0 pointer-events-none' : 'translate-x-0'
          )}
        >
          <DomainSidebar
            header={null}
            position="left"
            storageKey="interior-toolbar"
            defaultWidth={80}
            rawContent
          >
            <div id={TOUR_STEP_IDS.INTERIOR_TOOLBAR} className="flex-1 py-4">
              <Toolbar />
            </div>
          </DomainSidebar>
        </div>

        {/* 3D Canvas Area */}
        <div className="flex-1 relative bg-black overflow-hidden">
          <div
            className="absolute inset-0 z-0"
            id={TOUR_STEP_IDS.INTERIOR_CANVAS}
            data-html2canvas-ignore="true"
            onDragOver={e => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'copy'
            }}
            onDrop={e => {
              e.preventDefault()
              try {
                const data = JSON.parse(e.dataTransfer.getData('application/json'))
                if (data.type === 'asset' && data.glbUrl) {
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

          {/* Zen Mode Tip */}
          {!zenMode && (
            <div className="absolute bottom-6 left-6 text-[10px] font-mono font-bold uppercase tracking-widest text-zinc-500/40 hover:text-zinc-400 transition-colors cursor-default select-none pointer-events-none z-10">
              Press{' '}
              <span className="px-1.5 py-0.5 border border-zinc-700/50 rounded bg-zinc-800/50 text-zinc-300">
                Tab
              </span>{' '}
              for Zen Mode
            </div>
          )}
        </div>

        {/* Right Sidebar: Properties & Assets */}
        <div
          className={cn(
            'transition-all duration-700 ease-in-out h-full',
            zenMode ? 'translate-x-full opacity-0 pointer-events-none' : 'translate-x-0'
          )}
        >
          <DomainSidebar
            header={null}
            position="right"
            storageKey="interior-properties"
            defaultWidth={400}
            rawContent
          >
            <div className="flex flex-col h-full bg-background/20">
              {/* Upper Section: Asset Library (only for OBJECT mode) */}
              {mode === 'OBJECT' && (
                <div
                  id={TOUR_STEP_IDS.INTERIOR_ASSETS}
                  className="h-[40%] border-b border-border/50"
                >
                  <AssetLibrary />
                </div>
              )}

              {/* Middle Section: Main Properties / Terrain */}
              <div id={TOUR_STEP_IDS.INTERIOR_TERRAIN} className="flex-1 min-h-0">
                <PropertiesPanel />
              </div>

              {/* Lower Section: Layer Panel */}
              <div className="h-[30%] border-t border-border/50 overflow-hidden">
                <LayerPanel />
              </div>
            </div>
          </DomainSidebar>
        </div>
      </div>
    </div>
  )
}
