import { Label, Progress } from 'world-building-kit'

export const GenerationProgress = () => (
  <div className="grid w-80 gap-2">
    <div className="flex justify-between text-sm">
      <Label>Generating episode beats</Label>
      <span className="text-muted-foreground">8 / 12</span>
    </div>
    <Progress value={66} />
  </div>
)

export const Stages = () => (
  <div className="grid w-80 gap-4">
    <Progress value={15} />
    <Progress value={50} />
    <Progress value={90} />
  </div>
)
