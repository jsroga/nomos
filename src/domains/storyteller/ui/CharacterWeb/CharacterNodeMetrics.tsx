'use client'

import React from 'react'
import { cn } from '@/shared/data/utils'

interface CharacterNodeMetricsProps {
  stressLevel: number
  transformationProgress: number
}

export function CharacterNodeMetrics({
  stressLevel,
  transformationProgress,
}: CharacterNodeMetricsProps) {
  return (
    <div className="mt-2 pt-2 border-t border-zinc-700/50 space-y-1">
      {stressLevel > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-zinc-500 w-12">Stress</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                stressLevel > 70
                  ? 'bg-red-500'
                  : stressLevel > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
              )}
              style={{ width: `${stressLevel}%` }}
            />
          </div>
          <span className="text-[9px] text-zinc-500 w-6 text-right">{stressLevel}%</span>
        </div>
      )}

      {transformationProgress > 0 && (
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-zinc-500 w-12">Arc</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all"
              style={{ width: `${transformationProgress}%` }}
            />
          </div>
          <span className="text-[9px] text-zinc-500 w-6 text-right">
            {transformationProgress}%
          </span>
        </div>
      )}
    </div>
  )
}
