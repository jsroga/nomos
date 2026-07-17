import React from 'react'
import type { StorytellerCharacter } from '@/domains/storyteller/core/entities/character-wire'
import {
  CHARACTER_METRIC_CONFIG,
  getMetricBarColor,
  getMetricDisplayValues,
  isMetricHighRisk,
} from './character-metric-helpers'

interface CharacterMetricGridProps {
  character: StorytellerCharacter
}

export const CharacterMetricGrid: React.FC<CharacterMetricGridProps> = ({ character }) => (
  <div className="space-y-2">
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold mb-2">
      Character Metrics
    </div>
    {CHARACTER_METRIC_CONFIG.map(metric => {
      const { value, displayPercentage, displayValue } = getMetricDisplayValues(
        character,
        metric.key,
        metric.isValence
      )
      const isHighRisk = isMetricHighRisk(metric.key, value)
      const barColor = getMetricBarColor(isHighRisk, metric.isValence, value, displayPercentage)

      return (
        <div key={metric.key} className="space-y-0.5">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1.5">
              <metric.icon size={12} className={metric.color} />
              <span className="text-muted-foreground">{metric.label}</span>
            </div>
            <span className={isHighRisk ? 'text-destructive font-bold' : 'text-muted-foreground'}>
              {displayValue}
            </span>
          </div>
          <div className="relative">
            <div className="h-1 bg-secondary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${isHighRisk ? 'bg-destructive' : ''}`}
                style={{
                  width: `${Math.max(0, Math.min(100, displayPercentage))}%`,
                  backgroundColor: barColor,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-0.5">
              <span>{metric.lowLabel}</span>
              <span>{metric.highLabel}</span>
            </div>
          </div>
        </div>
      )
    })}
  </div>
)
