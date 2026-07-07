import { Label, Slider } from 'world-building-kit'

export const TuningSlider = () => (
  <div className="grid w-80 gap-3">
    <div className="flex justify-between text-sm">
      <Label>Creative temperature</Label>
      <span className="text-muted-foreground">0.7</span>
    </div>
    <Slider defaultValue={[70]} max={100} step={1} />
  </div>
)

export const Range = () => (
  <div className="grid w-80 gap-3">
    <div className="flex justify-between text-sm">
      <Label>Episode length (min)</Label>
      <span className="text-muted-foreground">35–48</span>
    </div>
    <Slider defaultValue={[35, 48]} max={60} step={1} />
  </div>
)

export const Disabled = () => (
  <div className="grid w-80 gap-3">
    <Label>Locked while generating</Label>
    <Slider defaultValue={[40]} max={100} disabled />
  </div>
)
