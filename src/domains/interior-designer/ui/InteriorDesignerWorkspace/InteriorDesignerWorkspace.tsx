'use client'

import React, { useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Loader2, Download, Save, Focus } from 'lucide-react'
import { debounce } from 'lodash'
import { Button } from '@/components/Button'
import { DomainSidebar } from '@/components/DomainSidebar'
import { DOM_EVENT_KEYDOWN, KEYBOARD_KEY_TAB } from '@/domains/interior-designer/constants/keyboard'
import { DesignManager } from '@/domains/interior-designer/ui/DesignManager'
import { InteriorRightSidebar } from '@/domains/interior-designer/ui/UI/InteriorRightSidebar'
import { Toolbar } from '@/domains/interior-designer/ui/UI/Toolbar'
import { useInteriorStore } from '@/domains/interior-designer/state'
import { useProjectFromUrl } from '@/shared/data/useProjectFromUrl'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { cn } from '@/shared/data/utils'
import { useWorldStore } from '@/domains/world-building-toolkit'

// Dynamic import with SSR disabled to avoid React reconciler issues with Three.js
const InteriorCanvas = dynamic(
  () =>
    import('@/domains/interior-designer/ui/InteriorCanvas').then(mod => ({
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

export function InteriorDesignerWorkspace() {
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
    [currentProject?.id, hasUnsavedChanges, saveDesign]
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
      if (e.key === KEYBOARD_KEY_TAB) {
        e.preventDefault()
        toggleZenMode()
      }
    }
    window.addEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
    return () => window.removeEventListener(DOM_EVENT_KEYDOWN, handleKeyDown)
  }, [toggleZenMode])

  return (
    <div className="w-full h-screen flex flex-col bg-black text-zinc-200 font-sans selection:bg-indigo-500/30 overflow-hidden">
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
          <DesignManager />
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
                  await import('@/domains/interior-designer/core/UnityExporter').then(m =>
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

      <div className="flex-1 flex relative overflow-hidden">
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
            <InteriorRightSidebar />
          </DomainSidebar>
        </div>
      </div>
    </div>
  )
}
