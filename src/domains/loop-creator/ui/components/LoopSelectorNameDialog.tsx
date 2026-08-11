'use client'

import { Loader2 } from 'lucide-react'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/Dialog'

interface LoopSelectorNameDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingLoopId: string | null
  loopName: string
  onLoopNameChange: (value: string) => void
  gameConcept: string
  onGameConceptChange: (value: string) => void
  isCreating: boolean
  onSave: () => void
}

export function LoopSelectorNameDialog({
  open,
  onOpenChange,
  editingLoopId,
  loopName,
  onLoopNameChange,
  gameConcept,
  onGameConceptChange,
  isCreating,
  onSave,
}: LoopSelectorNameDialogProps) {
  const isRename = editingLoopId !== null
  const canSave = loopName.trim().length > 0 && (isRename || gameConcept.trim().length > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isRename ? 'Rename Loop' : 'Create New Game Loop'}</DialogTitle>
          <DialogDescription>
            {isRename
              ? 'Enter a new name for this game loop.'
              : 'Describe your game concept and the AI will start designing immediately.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Loop Name</label>
            <Input
              value={loopName}
              onChange={e => onLoopNameChange(e.target.value)}
              placeholder="e.g., Disco Elysium RPG, Roguelike Deckbuilder..."
              autoFocus
            />
          </div>

          {!isRename && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Game Concept <span className="text-red-500">*</span>
              </label>
              <textarea
                value={gameConcept}
                onChange={e => onGameConceptChange(e.target.value)}
                placeholder="Describe your game idea... e.g., A narrative RPG like Disco Elysium set in a cyberpunk world, focusing on dialogue and skill checks..."
                className="w-full min-h-[100px] px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                onKeyDown={e => {
                  if (e.key === 'Enter' && e.metaKey) onSave()
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={!canSave || isCreating}>
            {isCreating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRename ? (
              'Save'
            ) : (
              'Create & Generate'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
