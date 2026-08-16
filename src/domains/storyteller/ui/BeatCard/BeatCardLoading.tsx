import { Loader2 } from 'lucide-react'
import { BeatCardCopy } from './constants/beat-card'

export function BeatCardLoading() {
  return (
    <div
      className="min-h-[120px] border border-border border-l-[3px] border-l-primary/50 bg-card text-foreground p-4 rounded-md flex flex-col items-center justify-center gap-2"
      aria-busy="true"
      aria-live="polite"
    >
      <Loader2 size={18} className="animate-spin text-primary" />
      <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
        {BeatCardCopy.Generating}
      </span>
    </div>
  )
}
