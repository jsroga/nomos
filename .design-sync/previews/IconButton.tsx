import { IconButton } from 'world-building-kit'
import { Wand2, Trash2, Pencil, Map, Loader2 } from 'lucide-react'

export const Variants = () => (
  <div className="flex items-center gap-3">
    <IconButton icon={<Wand2 className="h-4 w-4" />} onClick={() => {}} tooltip="Generate" />
    <IconButton
      icon={<Pencil className="h-4 w-4" />}
      onClick={() => {}}
      variant="secondary"
      tooltip="Edit"
    />
    <IconButton
      icon={<Map className="h-4 w-4" />}
      onClick={() => {}}
      variant="outline"
      tooltip="Open map"
    />
    <IconButton
      icon={<Trash2 className="h-4 w-4" />}
      onClick={() => {}}
      variant="destructive"
      tooltip="Delete"
    />
  </div>
)

export const States = () => (
  <div className="flex items-center gap-3">
    <IconButton icon={<Pencil className="h-4 w-4" />} onClick={() => {}} isActive />
    <IconButton icon={<Loader2 className="h-4 w-4" />} onClick={() => {}} isLoading />
    <IconButton icon={<Trash2 className="h-4 w-4" />} onClick={() => {}} disabled />
  </div>
)
