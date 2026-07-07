import { Input, Label, Switch, Textarea } from 'world-building-kit'

export const FormLabels = () => (
  <div className="grid w-80 gap-5">
    <div className="grid gap-2">
      <Label htmlFor="ep-title">Episode title</Label>
      <Input id="ep-title" placeholder="The Cartographer's Debt" />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="logline">Logline</Label>
      <Textarea id="logline" placeholder="One-sentence summary of the episode…" />
    </div>
    <div className="flex items-center gap-2">
      <Switch id="canon-lock" defaultChecked />
      <Label htmlFor="canon-lock">Lock as canon</Label>
    </div>
  </div>
)
