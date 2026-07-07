import { Input, Label } from 'world-building-kit'

export const WithLabel = () => (
  <div className="grid w-80 gap-2">
    <Label htmlFor="project-name">Project name</Label>
    <Input id="project-name" placeholder="e.g. The Hollow Crown" />
  </div>
)

export const Filled = () => (
  <div className="grid w-80 gap-2">
    <Label htmlFor="loc">Location</Label>
    <Input id="loc" defaultValue="Ashen Keep — upper battlements" />
  </div>
)

export const Disabled = () => (
  <div className="grid w-80 gap-2">
    <Label htmlFor="locked">Series title (locked)</Label>
    <Input id="locked" disabled defaultValue="The Hollow Crown" />
  </div>
)
