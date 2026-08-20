import React from 'react'
import { Button } from '@/components/Button'
import { Slider } from '@/components/Slider'
import { Loader2, Wand2 } from 'lucide-react'
import {
  CHARACTER_DIALOG_METRIC_KEYS,
  CharacterMetricFieldKey,
} from '@/domains/storyteller/core/character-missing-fields'
import { CharacterMetrics } from './character-creation-dialog-types'
import { useStorytellerChatBusy } from '@/domains/storyteller/state/hooks/useStorytellerChatBusy'
import {
  CHARACTER_DIALOG_METRIC_SLIDER_MAX,
  CHARACTER_DIALOG_METRIC_SLIDER_STEP,
  CHARACTER_DIALOG_VALENCE_SLIDER_MAX,
  CHARACTER_DIALOG_VALENCE_SLIDER_OFFSET,
  CharacterDialogMetricBoundLabel,
  CharacterDialogMetricLabel,
  CharacterDialogMetricsCopy,
  CharacterDialogMetricTitle,
} from './constants/character-creation-dialog'

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
  minLabel: string
  maxLabel: string
}

function signedMetricDisplay(value: number): string {
  return value > 0 ? `+${value}` : `${value}`
}

function percentMetricDisplay(value: number): string {
  return `${value}%`
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
      <Slider
        value={[value]}
        max={max}
        step={CHARACTER_DIALOG_METRIC_SLIDER_STEP}
        onValueChange={([val]) => onChange(val)}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground/60">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

function DialogMetricSlider({
  metricKey,
  metrics,
  onChange,
}: {
  metricKey: CharacterMetricFieldKey
  metrics: CharacterMetrics
  onChange: (key: CharacterMetricFieldKey, value: number) => void
}) {
  if (metricKey === CharacterMetricFieldKey.Valence) {
    return (
      <MetricSlider
        label={CharacterDialogMetricLabel.Valence}
        title={CharacterDialogMetricTitle.Valence}
        value={metrics.valence + CHARACTER_DIALOG_VALENCE_SLIDER_OFFSET}
        max={CHARACTER_DIALOG_VALENCE_SLIDER_MAX}
        onChange={val => onChange(metricKey, val - CHARACTER_DIALOG_VALENCE_SLIDER_OFFSET)}
        displayValue={signedMetricDisplay(metrics.valence)}
        minLabel={CharacterDialogMetricBoundLabel.Negative}
        maxLabel={CharacterDialogMetricBoundLabel.Positive}
      />
    )
  }
  if (metricKey === CharacterMetricFieldKey.Arousal) {
    return (
      <MetricSlider
        label={CharacterDialogMetricLabel.Arousal}
        title={CharacterDialogMetricTitle.Arousal}
        value={metrics.arousal}
        max={CHARACTER_DIALOG_METRIC_SLIDER_MAX}
        onChange={val => onChange(metricKey, val)}
        displayValue={percentMetricDisplay(metrics.arousal)}
        minLabel={CharacterDialogMetricBoundLabel.Lethargic}
        maxLabel={CharacterDialogMetricBoundLabel.Energized}
      />
    )
  }
  if (metricKey === CharacterMetricFieldKey.PerceivedStakes) {
    return (
      <MetricSlider
        label={CharacterDialogMetricLabel.PerceivedStakes}
        title={CharacterDialogMetricTitle.PerceivedStakes}
        value={metrics.perceivedStakes}
        max={CHARACTER_DIALOG_METRIC_SLIDER_MAX}
        onChange={val => onChange(metricKey, val)}
        displayValue={percentMetricDisplay(metrics.perceivedStakes)}
        minLabel={CharacterDialogMetricBoundLabel.Low}
        maxLabel={CharacterDialogMetricBoundLabel.Critical}
      />
    )
  }
  return (
    <MetricSlider
      label={CharacterDialogMetricLabel.MoralAlignment}
      title={CharacterDialogMetricTitle.MoralAlignment}
      value={metrics.moralAlignment}
      max={CHARACTER_DIALOG_METRIC_SLIDER_MAX}
      onChange={val => onChange(metricKey, val)}
      displayValue={percentMetricDisplay(metrics.moralAlignment)}
      minLabel={CharacterDialogMetricBoundLabel.Compromised}
      maxLabel={CharacterDialogMetricBoundLabel.Aligned}
    />
  )
}

export function CharacterCreationDialogMetricsFields({
  metrics,
  setMetrics,
  isGeneratingMetrics,
  hasDescription,
  onGenerateMetrics,
}: CharacterCreationDialogMetricsFieldsProps) {
  const isChatBusy = useStorytellerChatBusy()
  const updateMetric = (key: CharacterMetricFieldKey, value: number) => {
    setMetrics(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="space-y-4 pt-4 border-t border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold">{CharacterDialogMetricsCopy.Heading}</h3>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-7"
          onClick={onGenerateMetrics}
          disabled={isGeneratingMetrics || isChatBusy || !hasDescription}
        >
          {isGeneratingMetrics ? (
            <Loader2 className="animate-spin w-3 h-3 mr-1" />
          ) : (
            <Wand2 className="w-3 h-3 mr-1" />
          )}
          {CharacterDialogMetricsCopy.AutoSet}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4">
        {CHARACTER_DIALOG_METRIC_KEYS.map(metricKey => (
          <DialogMetricSlider
            key={metricKey}
            metricKey={metricKey}
            metrics={metrics}
            onChange={updateMetric}
          />
        ))}
      </div>
    </div>
  )
}
