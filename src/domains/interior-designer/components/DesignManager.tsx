import React, { useEffect, useState } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { useWorldStore } from '@/domains/world-building-toolkit/store/useWorldStore'
import { Button } from '@/components/ui/button'
import { Trash2, FileText, Plus, Edit2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { interiorDesignerApi } from '@/domains/interior-designer/io/interior-designer.api'
import type { InteriorDesignSummary } from '@/domains/interior-designer/io/interior-designer.dto'

export const DesignManager: React.FC = () => {
  const currentProject = useWorldStore(state => state.currentProject)
  const currentDesignId = useInteriorStore(state => state.currentDesignId)
  const currentDesignName = useInteriorStore(state => state.currentDesignName)
  const loadDesign = useInteriorStore(state => state.loadDesign)
  const deleteDesign = useInteriorStore(state => state.deleteDesign)
  const newDesign = useInteriorStore(state => state.newDesign)
  const renameDesign = useInteriorStore(state => state.renameDesign)
  const hasUnsavedChanges = useInteriorStore(state => state.hasUnsavedChanges)

  const [designs, setDesigns] = useState<InteriorDesignSummary[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [newSceneName, setNewSceneName] = useState('New Scene')
  const [editingDesignId, setEditingDesignId] = useState<string | null>(null)

  const fetchDesigns = async () => {
    if (!currentProject?.id) return

    try {
      const data = await interiorDesignerApi.listDesigns(currentProject.id)
      setDesigns(data)
    } catch (error) {
      console.error('Failed to fetch designs:', error)
    }
  }

  useEffect(() => {
    let isActive = true

    if (!currentProject?.id || !isOpen) {
      return () => {
        isActive = false
      }
    }

    void (async () => {
      try {
        const data = await interiorDesignerApi.listDesigns(currentProject.id)
        if (isActive) {
          setDesigns(data)
        }
      } catch (error) {
        console.error('Failed to fetch designs:', error)
      }
    })()

    return () => {
      isActive = false
    }
  }, [currentProject?.id, isOpen])

  const handleLoad = async (designId: string) => {
    if (hasUnsavedChanges && currentProject?.id) {
      await useInteriorStore.getState().saveDesign(currentProject.id)
    }
    await loadDesign(designId)
    setIsOpen(false)
  }

  const handleDelete = async (designId: string) => {
    const confirmed = await confirm({
      title: 'Delete Scene',
      description: 'Are you sure you want to delete this scene? This action cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'destructive',
    })
    if (confirmed) {
      await deleteDesign(designId)
      await fetchDesigns()
    }
  }

  const handleNew = async () => {
    if (hasUnsavedChanges && currentProject?.id) {
      await useInteriorStore.getState().saveDesign(currentProject.id)
    }
    setEditingDesignId(null)
    setNewSceneName('New Scene')
    setIsNameDialogOpen(true)
  }

  const handleRename = (designId: string, currentName: string) => {
    setEditingDesignId(designId)
    setNewSceneName(currentName)
    setIsNameDialogOpen(true)
  }

  const handleSaveScene = async () => {
    if (newSceneName.trim()) {
      if (editingDesignId) {
        // Renaming existing
        await renameDesign(editingDesignId, newSceneName.trim())
        await fetchDesigns()
      } else {
        // Creating new
        newDesign()
        // Immediately save the new design to create a record
        if (currentProject?.id) {
          await useInteriorStore.getState().saveDesign(currentProject.id, newSceneName.trim())
          await fetchDesigns()
        }
      }
    }
    setIsNameDialogOpen(false)
    if (!editingDesignId) {
      setIsOpen(false)
    }
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
                    className={`p-3 rounded border mb-2 flex items-center justify-between group ${
                      design.id === currentDesignId
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

                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          handleRename(design.id, design.name)
                        }}
                        title="Rename"
                      >
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={e => {
                          e.stopPropagation()
                          handleDelete(design.id)
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}
      {ConfirmDialogComponent}

      {/* Scene Name Dialog */}
      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingDesignId ? 'Rename Scene' : 'New Scene'}</DialogTitle>
            <DialogDescription>
              {editingDesignId
                ? 'Enter a new name for the scene.'
                : 'Enter a name for your new scene.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newSceneName}
              onChange={e => setNewSceneName(e.target.value)}
              placeholder="Scene name"
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveScene()
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveScene}>{editingDesignId ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
