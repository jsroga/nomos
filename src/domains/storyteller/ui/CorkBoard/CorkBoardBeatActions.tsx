import { Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { CorkBoardCopy } from './constants/cork-board'

interface CorkBoardBeatActionsProps {
  beatCount: number
  isGeneratingImages: boolean
  isGeneratingTextBeats: boolean
  onGenerateNext: () => void
  onGenerateImages: () => void
  onCancelImages: () => void
}

export function CorkBoardBeatActions({
  beatCount,
  isGeneratingImages,
  isGeneratingTextBeats,
  onGenerateNext,
  onGenerateImages,
  onCancelImages,
}: CorkBoardBeatActionsProps) {
  const imagesBusy = isGeneratingImages
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onGenerateNext}
        disabled={isGeneratingTextBeats}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isGeneratingTextBeats ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {isGeneratingTextBeats ? CorkBoardCopy.Generating : CorkBoardCopy.GenerateNextBeat}
      </button>
      {beatCount > 0 ? (
        <button
          type="button"
          onClick={imagesBusy ? onCancelImages : onGenerateImages}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {imagesBusy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
          {imagesBusy ? CorkBoardCopy.CancelStoryboard : CorkBoardCopy.GenerateImages}
        </button>
      ) : null}
    </div>
  )
}
