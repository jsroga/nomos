import React from 'react'
import { Button } from '@/components/Button'
import { Slider } from '@/components/Slider'
import { Loader2, Wand2 } from 'lucide-react'
import { CharacterMetrics } from './character-creation-dialog-types'

interface CharacterCreationDialogMetricsFieldsProps {
  metrics: CharacterMetrics
  setMetrics: React.Dispatch<React.SetStateAction<CharacterMetrics>>
  isGeneratingMetrics: boolean
  hasDescription: boolean
  onGenerateMetrics: () => void
}

interface MetricSliderProps {
  label: string
  title: string
  value: number
  max: number
  onChange: (value: number) => void
  displayValue: string
  minLabel?: string
  maxLabel?: string
}

function MetricSlider({
  label,
  title,
  value,
  max,
  onChange,
  displayValue,
  minLabel,
  maxLabel,
}: MetricSliderProps) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground" title={title}>
          {label}
        </span>
        <span className="font-mono">{displayValue}</span>
      </div>
      <Slider value={[value]} max={max} step={1} onValueChange={([val]) => onChange(val)} />
      {minLabel && maxLabel && (
        <div className="flex justify-between text-[10px] text-muted-foreground/60">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
    </div>
  )
}

export function CharacterCreationDialogMetricsFields({
  metrics,
  setMetrics,
  isGeneratingMetrics,
  hasDescription,
  onGenerateMetrics,
}: CharacterCreationDialogMetricsFieldsProps) {
  const updateMetric = (key: keyof CharacterMetrics, value: number) => {
    setMetrics(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">Baseline Psychological Metrics</h3>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={onGenerateMetrics}
          disabled={isGeneratingMetrics || !hasDescription}
        >
          {isGeneratingMetrics ? (
            <Loader2 className="animate-spin w-3 h-3 mr-1" />
          ) : (
            <Wand2 className="w-3 h-3 mr-1" />
          )}
          Auto-set from Description
        </Button>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Emotional State
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <MetricSlider
            label="Valence"
            title="Emotional tone from very negative to very positive"
            value={metrics.valence + 100}
            max={200}
            onChange={val => updateMetric('valence', val - 100)}
            displayValue={`${metrics.valence > 0 ? '+' : ''}${metrics.valence}`}
            minLabel="Negative"
            maxLabel="Positive"
          />
          <MetricSlider
            label="Arousal"
            title="Energy and activation level"
            value={metrics.arousal}
            max={100}
            onChange={val => updateMetric('arousal', val)}
            displayValue={`${metrics.arousal}%`}
            minLabel="Lethargic"
            maxLabel="Energized"
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Core Needs
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <MetricSlider
            label="Autonomy"
            title="Perceived freedom and self-direction"
            value={metrics.autonomy}
            max={100}
            onChange={val => updateMetric('autonomy', val)}
            displayValue={`${metrics.autonomy}%`}
          />
          <MetricSlider
            label="Competence"
            title="Belief in capability to handle challenges"
            value={metrics.competence}
            max={100}
            onChange={val => updateMetric('competence', val)}
            displayValue={`${metrics.competence}%`}
          />
          <MetricSlider
            label="Relatedness"
            title="Sense of connection to others"
            value={metrics.relatedness}
            max={100}
            onChange={val => updateMetric('relatedness', val)}
            displayValue={`${metrics.relatedness}%`}
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Mental State
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <MetricSlider
            label="Cognitive Clarity"
            title="Mental sharpness and decision-making capacity"
            value={metrics.cognitiveClarity}
            max={100}
            onChange={val => updateMetric('cognitiveClarity', val)}
            displayValue={`${metrics.cognitiveClarity}%`}
          />
          <MetricSlider
            label="Perceived Stakes"
            title="How much they believe is on the line"
            value={metrics.perceivedStakes}
            max={100}
            onChange={val => updateMetric('perceivedStakes', val)}
            displayValue={`${metrics.perceivedStakes}%`}
          />
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Social & Moral
        </h4>
        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <MetricSlider
            label="Social Safety"
            title="Perceived safety in current social context"
            value={metrics.socialSafety}
            max={100}
            onChange={val => updateMetric('socialSafety', val)}
            displayValue={`${metrics.socialSafety}%`}
          />
          <MetricSlider
            label="Moral Alignment"
            title="Alignment between actions and values"
            value={metrics.moralAlignment}
            max={100}
            onChange={val => updateMetric('moralAlignment', val)}
            displayValue={`${metrics.moralAlignment}%`}
          />
        </div>
      </div>
    </div>
  )
}
