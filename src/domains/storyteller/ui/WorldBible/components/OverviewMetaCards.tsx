import React from 'react'
import { Zap, Star } from 'lucide-react'

interface OverviewMetaGridProps {
  centralQuestion?: string
}

export const OverviewMetaGrid: React.FC<OverviewMetaGridProps> = ({
  centralQuestion,
}) => {
  if (!centralQuestion) {
    return null
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {centralQuestion ? (
        <div className="md:col-span-1 p-6 rounded-xl bg-muted/10 border border-border/40 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-muted-foreground/60" />
            <div className="text-[10px] font-bold font-mono text-muted-foreground/60 uppercase tracking-widest">
              Central Question
            </div>
          </div>
          <div className="text-lg font-syne italic text-foreground/90 leading-snug">
            &quot;{centralQuestion}&quot;
          </div>
        </div>
      ) : null}
    </div>
  )
}

interface OverviewExecutiveSummaryProps {
  summary: string
}

export const OverviewExecutiveSummary: React.FC<OverviewExecutiveSummaryProps> = ({ summary }) => (
  <div className="mb-8 p-6 rounded-xl bg-orange-500/5 border border-orange-500/10">
    <div className="flex items-center gap-2 mb-3">
      <Star className="w-4 h-4 text-orange-400" />
      <h4 className="font-bold text-sm uppercase tracking-wider text-orange-400">
        Executive Summary
      </h4>
    </div>
    <p className="text-lg font-medium text-foreground/90 leading-relaxed font-syne">{summary}</p>
  </div>
)
