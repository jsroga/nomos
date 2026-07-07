import { Badge } from 'world-building-kit'

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge>Canon</Badge>
    <Badge variant="secondary">Draft</Badge>
    <Badge variant="outline">Season 2</Badge>
    <Badge variant="destructive">Conflict</Badge>
  </div>
)

export const EntityTypes = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge className="border-blue-500/20 bg-blue-500/10 text-blue-500">Character</Badge>
    <Badge className="border-green-500/20 bg-green-500/10 text-green-500">Location</Badge>
    <Badge className="border-purple-500/20 bg-purple-500/10 text-purple-500">Mechanic</Badge>
    <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-500">Quest</Badge>
  </div>
)
