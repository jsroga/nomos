import { Label, Switch } from 'world-building-kit'

export const Toggles = () => (
  <div className="grid w-72 gap-4">
    <div className="flex items-center justify-between">
      <Label htmlFor="s1">Consistency check</Label>
      <Switch id="s1" defaultChecked />
    </div>
    <div className="flex items-center justify-between">
      <Label htmlFor="s2">Auto-save drafts</Label>
      <Switch id="s2" />
    </div>
    <div className="flex items-center justify-between">
      <Label htmlFor="s3" className="opacity-50">
        Beta features
      </Label>
      <Switch id="s3" disabled />
    </div>
  </div>
)
