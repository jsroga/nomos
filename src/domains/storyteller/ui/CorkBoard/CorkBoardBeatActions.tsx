import { Image as ImageIcon, Loader2, Sparkles } from 'lucide-react'
import { CorkBoardCopy } from './constants/cork-board'

interface CorkBoardBeatActionsProps {
  beatCount: number
  isGeneratingImages: boolean
  isChatBusy: boolean
  onGenerateText: () => void
  onGenerateNext: () => void
  onGenerateImages: () => void
}

export function CorkBoardBeatActions({
  beatCount,
  isGeneratingImages,
  isChatBusy,
  onGenerateText,
  onGenerateNext,
  onGenerateImages,
}: CorkBoardBeatActionsProps) {
  const textBusy = isChatBusy || isGeneratingImages
  const imagesBusy = isGeneratingImages
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onGenerateNext}
        disabled={textBusy}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isChatBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {isChatBusy ? CorkBoardCopy.Generating : CorkBoardCopy.GenerateNextBeat}
      </button>
      <button
        type="button"
        onClick={onGenerateText}
        disabled={textBusy}
        className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isChatBusy ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
        {isChatBusy ? CorkBoardCopy.Generating : CorkBoardCopy.GenerateBeats}
      </button>
      {beatCount > 0 ? (
        <button
          type="button"
          onClick={onGenerateImages}
          disabled={imagesBusy || isChatBusy}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/30 rounded-md text-[11px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {imagesBusy ? <Loader2 size={12} className="animate-spin" /> : <ImageIcon size={12} />}
          {imagesBusy ? CorkBoardCopy.Generating : CorkBoardCopy.GenerateImages}
        </button>
      ) : null}
    </div>
  )
}
