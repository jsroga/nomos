'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, RefreshCw, ChevronDown, Check, Loader2, Edit2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { cn } from '@/shared/data/utils'
import { buildUrl } from '@/shared/data/url-builder'
import { QueryParam } from '@/shared/data/constants/protocol'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'
import { ScrollArea } from '@/components/ScrollArea'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { LoopHttpMethod } from '@/domains/loop-creator/constants/loop-http'
import {
  LOOP_SELECTOR_DEFAULT_NAME,
  LOOP_SELECTOR_DELETE_CANCEL,
  LOOP_SELECTOR_DELETE_CONFIRM,
  LOOP_SELECTOR_DELETE_FAILED_LOG,
  LOOP_SELECTOR_DELETE_TITLE,
  LOOP_SELECTOR_FETCH_FAILED_LOG,
  LOOP_SELECTOR_RESET_CANCEL,
  LOOP_SELECTOR_RESET_CONFIRM,
  LOOP_SELECTOR_RESET_DESCRIPTION,
  LOOP_SELECTOR_RESET_TITLE,
  LOOP_SELECTOR_LOCALE_OPTIONS,
  LOOP_SELECTOR_LOCALE_TAG,
  LoopSelectorConfirmVariant,
} from '@/domains/loop-creator/constants/loop-selector'

export interface PersistedGameLoop {
  id: string
  name: string
  nodes: unknown[]
  edges: unknown[]
  metadata: unknown
  analysis: unknown
  createdAt: string
  updatedAt: string
}

interface LoopSelectorProps {
  projectId: string
  currentLoopId: string | null
  onLoopChange: (loop: PersistedGameLoop | null) => void
  onCreateLoop: (name: string, gameConcept?: string) => Promise<PersistedGameLoop | null>
  onReset: () => void
  externalOpenDialog?: boolean
  onExternalOpenDialogChange?: (open: boolean) => void
  onLoopCreated?: (loop: PersistedGameLoop, gameConcept: string) => void
}

export function LoopSelector({
  projectId,
  currentLoopId,
  onLoopChange,
  onCreateLoop,
  onReset,
  externalOpenDialog,
  onExternalOpenDialogChange,
  onLoopCreated,
}: LoopSelectorProps) {
  const [loops, setLoops] = useState<PersistedGameLoop[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Dialog states
  const [isNameDialogOpen, setIsNameDialogOpen] = useState(false)
  const [loopName, setLoopName] = useState(LOOP_SELECTOR_DEFAULT_NAME)
  const [gameConcept, setGameConcept] = useState('')
  const [editingLoopId, setEditingLoopId] = useState<string | null>(null)

  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  // Handle external trigger to open create dialog
  useEffect(() => {
    if (externalOpenDialog) {
      setEditingLoopId(null)
      setLoopName(LOOP_SELECTOR_DEFAULT_NAME)
      setGameConcept('')
      setIsNameDialogOpen(true)
      onExternalOpenDialogChange?.(false)
    }
  }, [externalOpenDialog, onExternalOpenDialogChange])

  const currentLoop = loops.find(l => l.id === currentLoopId)

  // Fetch loops on mount and when projectId changes
  const fetchLoops = useCallback(async () => {
    if (!projectId) return

    setIsLoading(true)
    try {
      const response = await fetch(buildUrl('/api/loop-creator/loops', { [QueryParam.ProjectId]: projectId }))
      if (response.ok) {
        const data = await response.json()
        setLoops(data)
      }
    } catch (error) {
      console.error(LOOP_SELECTOR_FETCH_FAILED_LOG, error)
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    fetchLoops()
  }, [fetchLoops])

  // Handle creating a new loop
  const handleNew = () => {
    setEditingLoopId(null)
    setLoopName(LOOP_SELECTOR_DEFAULT_NAME)
    setGameConcept('')
    setIsNameDialogOpen(true)
  }

  // Handle renaming a loop
  const handleRename = (loopId: string, currentName: string) => {
    setEditingLoopId(loopId)
    setLoopName(currentName)
    setGameConcept('') // Not needed for rename
    setIsNameDialogOpen(true)
  }

  // Handle saving (create or rename)
  const handleSaveLoop = async () => {
    if (!loopName.trim()) return

    // For new loops, require a game concept
    if (!editingLoopId && !gameConcept.trim()) return

    setIsCreating(true)
    try {
      if (editingLoopId) {
        // Renaming existing loop
        const response = await fetch('/api/loop-creator/loops', {
          method: LoopHttpMethod.Patch,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingLoopId, name: loopName.trim() }),
        })
        if (response.ok) {
          await fetchLoops()
        }
      } else {
        // Creating new loop with game concept
        const newLoop = await onCreateLoop(loopName.trim(), gameConcept.trim())
        if (newLoop) {
          setLoops(prev => [newLoop, ...prev])
          setIsOpen(false)
          // Trigger auto-start with game concept
          onLoopCreated?.(newLoop, gameConcept.trim())
        }
      }
    } finally {
      setIsCreating(false)
      setIsNameDialogOpen(false)
      setGameConcept('')
    }
  }

  // Handle switching loops
  const handleSwitchLoop = (loop: PersistedGameLoop) => {
    onLoopChange(loop)
    setIsOpen(false)
  }

  // Handle deleting a loop
  const handleDeleteLoop = async (loopId: string, loopName: string) => {
    const confirmed = await confirm({
      title: LOOP_SELECTOR_DELETE_TITLE,
      description: `Are you sure you want to delete "${loopName}"? This action cannot be undone.`,
      confirmLabel: LOOP_SELECTOR_DELETE_CONFIRM,
      cancelLabel: LOOP_SELECTOR_DELETE_CANCEL,
      variant: LoopSelectorConfirmVariant.Destructive,
    })

    if (!confirmed) return

    setIsDeleting(true)
    try {
      const response = await fetch(buildUrl('/api/loop-creator/loops', { [QueryParam.Id]: loopId }), {
        method: LoopHttpMethod.Delete,
      })

      if (response.ok) {
        setLoops(prev => prev.filter(l => l.id !== loopId))
        if (currentLoopId === loopId) {
          // Switch to first available loop or clear
          const remaining = loops.filter(l => l.id !== loopId)
          onLoopChange(remaining[0] || null)
        }
      }
    } catch (error) {
      console.error(LOOP_SELECTOR_DELETE_FAILED_LOG, error)
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle reset confirmation
  const handleReset = async () => {
    const confirmed = await confirm({
      title: LOOP_SELECTOR_RESET_TITLE,
      description: LOOP_SELECTOR_RESET_DESCRIPTION,
      confirmLabel: LOOP_SELECTOR_RESET_CONFIRM,
      cancelLabel: LOOP_SELECTOR_RESET_CANCEL,
      variant: LoopSelectorConfirmVariant.Destructive,
    })

    if (confirmed) {
      onReset()
      setIsOpen(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString(LOOP_SELECTOR_LOCALE_TAG, LOOP_SELECTOR_LOCALE_OPTIONS)
  }

  return (
    <div className="relative">
      {/* Main Button */}
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[200px] justify-between gap-2 bg-background/50 border-border/50 hover:bg-background/80"
      >
        <span className="truncate">{currentLoop?.name || 'Select Loop'}</span>
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform', isOpen && 'rotate-180')}
        />
      </Button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[320px] z-50 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
          {/* Header Actions */}
          <div className="p-3 border-b border-border flex gap-2">
            <Button variant="default" size="sm" onClick={handleNew} className="flex-1 gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              New Loop
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!currentLoopId}
              className="gap-1.5 text-amber-500 hover:text-amber-400 hover:border-amber-500/50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset
            </Button>
          </div>

          {/* Loops List */}
          <ScrollArea className="max-h-[300px]">
            <div className="p-1">
              {isLoading ? (
                <div className="p-6 text-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  <span className="text-sm">Loading loops...</span>
                </div>
              ) : loops.length === 0 ? (
                <div className="p-6 text-center">
                  <div className="text-muted-foreground text-sm mb-3">No loops yet</div>
                  <Button size="sm" onClick={handleNew} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Create your first loop
                  </Button>
                </div>
              ) : (
                loops.map(loop => (
                  <div
                    key={loop.id}
                    className={cn(
                      'group rounded-md mb-1 cursor-pointer',
                      currentLoopId === loop.id ? 'bg-primary/10' : 'hover:bg-muted/50'
                    )}
                    onClick={() => handleSwitchLoop(loop)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleSwitchLoop(loop)}
                  >
                    <div className="w-full p-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {currentLoopId === loop.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                          <span
                            className={cn(
                              'font-medium text-sm',
                              currentLoopId === loop.id && 'text-primary'
                            )}
                          >
                            {loop.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleRename(loop.id, loop.name)
                            }}
                            className="p-1.5 hover:bg-muted rounded transition-colors"
                            title="Rename"
                          >
                            <Edit2 className="h-3 w-3 text-muted-foreground" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation()
                              handleDeleteLoop(loop.id, loop.name)
                            }}
                            disabled={isDeleting}
                            className="p-1.5 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 pl-6">
                        {loop.nodes?.length || 0} nodes · Updated {formatDate(loop.updatedAt)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />}

      {/* Name Dialog (Create / Rename) */}
      <Dialog open={isNameDialogOpen} onOpenChange={setIsNameDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>{editingLoopId ? 'Rename Loop' : 'Create New Game Loop'}</DialogTitle>
            <DialogDescription>
              {editingLoopId
                ? 'Enter a new name for this game loop.'
                : 'Describe your game concept and the AI will start designing immediately.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Loop Name</label>
              <Input
                value={loopName}
                onChange={e => setLoopName(e.target.value)}
                placeholder="e.g., Disco Elysium RPG, Roguelike Deckbuilder..."
                autoFocus
              />
            </div>

            {/* Game concept - only for new loops */}
            {!editingLoopId && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Game Concept <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={gameConcept}
                  onChange={e => setGameConcept(e.target.value)}
                  placeholder="Describe your game idea... e.g., A narrative RPG like Disco Elysium set in a cyberpunk world, focusing on dialogue and skill checks..."
                  className="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && e.metaKey) handleSaveLoop()
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Include genre, inspiration games, and unique mechanics. Press Cmd+Enter to
                  create.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveLoop}
              disabled={!loopName.trim() || (!editingLoopId && !gameConcept.trim()) || isCreating}
            >
              {isCreating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingLoopId ? (
                'Save'
              ) : (
                'Create & Generate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {ConfirmDialogComponent}
    </div>
  )
}
