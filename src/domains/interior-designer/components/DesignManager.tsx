'use client'

import React, { useEffect, useState } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Button } from '@/components/ui/button'
import { Trash2, FileText, Plus } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

interface Design {
  id: string
  name: string
  updatedAt: string
}

export const DesignManager: React.FC = () => {
  const currentProject = useWorldStore(state => state.currentProject)
  const currentDesignId = useInteriorStore(state => state.currentDesignId)
  const currentDesignName = useInteriorStore(state => state.currentDesignName)
  const loadDesign = useInteriorStore(state => state.loadDesign)
  const deleteDesign = useInteriorStore(state => state.deleteDesign)
  const newDesign = useInteriorStore(state => state.newDesign)
  const hasUnsavedChanges = useInteriorStore(state => state.hasUnsavedChanges)

  const [designs, setDesigns] = useState<Design[]>([])
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    if (currentProject?.id && isOpen) {
      fetchDesigns()
    }
  }, [currentProject?.id, isOpen])

  const fetchDesigns = async () => {
    if (!currentProject?.id) return

    try {
      const res = await fetch(`/api/interior-designer/designs?projectId=${currentProject.id}`)
      const data = await res.json()
      setDesigns(data)
    } catch (error) {
      console.error('Failed to fetch designs:', error)
    }
  }

  const handleLoad = async (designId: string) => {
    if (hasUnsavedChanges && currentProject?.id) {
      await useInteriorStore.getState().saveDesign(currentProject.id)
    }
    await loadDesign(designId)
    setIsOpen(false)
  }

  const handleDelete = async (designId: string) => {
    if (confirm('Are you sure you want to delete this scene?')) {
      await deleteDesign(designId)
      await fetchDesigns()
    }
  }

  const handleNew = async () => {
    if (hasUnsavedChanges && currentProject?.id) {
      await useInteriorStore.getState().saveDesign(currentProject.id)
    }

    const name = prompt('Enter scene name:', 'New Scene')
    if (name) {
      newDesign()
      // Immediately save the new design to create a record
      if (currentProject?.id) {
        await useInteriorStore.getState().saveDesign(currentProject.id, name)
        await fetchDesigns()
      }
    }
    setIsOpen(false)
  }

  if (!currentProject) {
    return (
      <Button size="sm" variant="outline" disabled>
        <FileText className="w-4 h-4 mr-2" />
        Scenes
      </Button>
    )
  }

  return (
    <div className="relative">
      <Button size="sm" variant="outline" onClick={() => setIsOpen(!isOpen)}>
        <FileText className="w-4 h-4 mr-2" />
        {currentDesignName || 'Scenes'}
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg z-50">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold">Scenes</h3>
            <Button size="sm" onClick={handleNew}>
              <Plus className="w-4 h-4 mr-1" />
              New
            </Button>
          </div>

          <ScrollArea className="h-64">
            <div className="p-2">
              {designs.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No scenes yet. Create your first scene!
                </div>
              ) : (
                designs.map(design => (
                  <div
                    key={design.id}
                    className={`p-3 rounded border mb-2 flex items-center justify-between ${design.id === currentDesignId
                      ? 'border-primary bg-accent'
                      : 'border-border hover:bg-accent/50'
                      }`}
                  >
                    <button onClick={() => handleLoad(design.id)} className="flex-1 text-left">
                      <div className="font-medium text-sm">{design.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(design.updatedAt).toLocaleDateString()}
                      </div>
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={e => {
                        e.stopPropagation()
                        handleDelete(design.id)
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
