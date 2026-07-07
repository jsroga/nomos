import { Button } from 'world-building-kit'
import { Wand2, Trash2, Plus } from 'lucide-react'

export const Variants = () => (
  <div className="flex flex-wrap items-center gap-3">
    <Button>Generate episode</Button>
    <Button variant="secondary">Save draft</Button>
    <Button variant="outline">Preview beats</Button>
    <Button variant="ghost">Dismiss</Button>
    <Button variant="link">View bible</Button>
    <Button variant="destructive">Delete scene</Button>
  </div>
)

export const Sizes = () => (
  <div className="flex items-center gap-3">
    <Button size="sm">Small</Button>
    <Button size="default">Default</Button>
    <Button size="lg">Large</Button>
    <Button size="icon" aria-label="Add entity">
      <Plus className="h-4 w-4" />
    </Button>
  </div>
)

export const WithIcons = () => (
  <div className="flex items-center gap-3">
    <Button>
      <Wand2 className="mr-2 h-4 w-4" />
      Generate with AI
    </Button>
    <Button variant="destructive">
      <Trash2 className="mr-2 h-4 w-4" />
      Remove character
    </Button>
  </div>
)

export const Disabled = () => (
  <div className="flex items-center gap-3">
    <Button disabled>Generating…</Button>
    <Button variant="outline" disabled>
      Awaiting approval
    </Button>
  </div>
)
