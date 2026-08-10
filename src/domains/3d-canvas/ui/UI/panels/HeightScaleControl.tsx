'use client'

import React from 'react'
import { Maximize } from 'lucide-react'
import { Slider } from '@/components/Slider'

const BASE_HEIGHT = 1.0

export function HeightScaleControl({
  currentScale,
  onScaleChange,
}: {
  objectId: string
  currentScale: [number, number, number]
  onScaleChange: (scale: [number, number, number]) => void
}) {
  const currentHeight = currentScale[1] * BASE_HEIGHT
  const [heightValue, setHeightValue] = React.useState(currentHeight)

  React.useEffect(() => {
    setHeightValue(currentScale[1] * BASE_HEIGHT)
  }, [currentScale[1]])

  const handleHeightChange = (newHeight: number) => {
    setHeightValue(newHeight)
    const scaleFactor = newHeight / BASE_HEIGHT
    onScaleChange([scaleFactor, scaleFactor, scaleFactor])
  }

  return (
    <div className="space-y-3 p-4 bg-zinc-900/30 rounded-lg border border-zinc-800/50 mt-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-mono font-medium flex items-center gap-1.5">
          <Maximize size={12} />
          Object Height
        </label>
        <span className="text-xs text-muted-foreground font-mono">{heightValue.toFixed(2)}m</span>
      </div>
      <Slider
        value={[heightValue]}
        min={0.1}
        max={10}
        step={0.1}
        onValueChange={vals => handleHeightChange(vals[0])}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>0.1m</span>
        <span>Proportional scaling</span>
        <span>10m</span>
      </div>
    </div>
  )
}
