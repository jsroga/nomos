import React from 'react'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Share2 } from 'lucide-react'

export function CollectableWordList() {
  const words = ['Finch', 'Harrington', 'Microscope', 'Blunt', 'Trauma', 'Embezzlement', '8:15pm']

  return (
    <div className="flex flex-col gap-3 py-2">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Collectable Word List</Label>
        <Share2 className="w-4 h-4 text-muted-foreground cursor-pointer hover:text-foreground" />
      </div>

      <div className="flex flex-wrap gap-2">
        {words.map(word => (
          <Badge
            key={word}
            variant="secondary"
            className="bg-secondary/50 hover:bg-secondary text-secondary-foreground font-normal"
          >
            {word}
          </Badge>
        ))}
      </div>
    </div>
  )
}
