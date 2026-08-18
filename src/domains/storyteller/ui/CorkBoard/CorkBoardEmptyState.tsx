import { LayoutGrid, Loader2, Plus, Sparkles } from 'lucide-react'
import { Button } from '@/components/Button'
import { CorkBoardCopy } from './constants/cork-board'

interface CorkBoardEmptyStateProps {
  isBusy: boolean
  readyToAdd?: boolean
  onGenerate: () => void
  onGenerateNext: () => void
  onAddBeat: () => void
  onAddToWorld?: () => void
}

export function CorkBoardEmptyState({
  isBusy,
  readyToAdd = false,
  onGenerate,
  onGenerateNext,
  onAddBeat,
  onAddToWorld,
}: CorkBoardEmptyStateProps) {
  return (
    <div className="w-full p-8 bg-card border border-dashed border-border rounded-md flex flex-col items-center justify-center min-h-[220px]">
      <div className="w-14 h-14 border-2 border-primary/30 rounded-md flex items-center justify-center mb-6">
        <LayoutGrid className="w-7 h-7 text-primary" />
      </div>
      <h3 className="font-mono text-xl font-semibold tracking-tight mb-2 text-foreground">
        {readyToAdd ? CorkBoardCopy.ReadyTitle : CorkBoardCopy.EmptyTitle}
      </h3>
      <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed text-center">
        {readyToAdd ? CorkBoardCopy.ReadyBody : CorkBoardCopy.EmptyBody}
      </p>
      {readyToAdd ? (
        <Button
          type="button"
          onClick={onAddToWorld}
          disabled={isBusy || !onAddToWorld}
          size="lg"
          className="gap-2 rounded-md font-medium"
        >
          {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isBusy ? CorkBoardCopy.Generating : CorkBoardCopy.AddToWorld}
        </Button>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button
            type="button"
            onClick={onGenerate}
            disabled={isBusy}
            size="lg"
            className="gap-2 rounded-md font-medium"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isBusy ? CorkBoardCopy.Generating : CorkBoardCopy.GenerateBeatBoard}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onGenerateNext}
            disabled={isBusy}
            size="lg"
            className="gap-2 rounded-md font-medium"
          >
            {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {isBusy ? CorkBoardCopy.Generating : CorkBoardCopy.GenerateNextBeat}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onAddBeat}
            disabled={isBusy}
            size="lg"
            className="gap-2 rounded-md font-medium"
          >
            <Plus className="w-4 h-4" />
            {CorkBoardCopy.AddBeat}
          </Button>
        </div>
      )}
    </div>
  )
}
