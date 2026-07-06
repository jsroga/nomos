import React from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { usePuzzleStore } from '../../state/usePuzzleUiStore'

export function NarrativeInput() {
  const { narrative, setNarrative } = usePuzzleStore()

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor="narrative" className="text-xs font-semibold uppercase text-muted-foreground">
        Ground Truth Narrative
      </Label>
      <Textarea
        id="narrative"
        placeholder="Under rate your wax testing draggable scenario..."
        className="min-h-[120px] resize-none bg-card/50 text-sm"
        value={narrative}
        onChange={e => setNarrative(e.target.value)}
      />
      <div className="text-[10px] text-muted-foreground text-right border-b border-border pb-4">
        Define the core mystery scenario here.
      </div>
    </div>
  )
}
