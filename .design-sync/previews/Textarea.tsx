import { Label, Textarea } from 'world-building-kit'

export const SceneDescription = () => (
  <div className="grid w-96 gap-2">
    <Label htmlFor="scene">Scene description</Label>
    <Textarea
      id="scene"
      rows={4}
      defaultValue="Night. The map room of Ashen Keep. Maren traces a border that wasn't there yesterday — the ink is still wet."
    />
  </div>
)

export const EmptyAndDisabled = () => (
  <div className="grid w-96 gap-5">
    <Textarea placeholder="Describe the game loop's core tension…" />
    <Textarea disabled defaultValue="Generation in progress…" />
  </div>
)
