import React from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { User, Box, MapPin, Flame, Clock, List } from 'lucide-react'
import { Card } from '@/components/ui/card'

export function SolutionTemplateBuilder() {
  const tokens = [
    { label: 'Person', icon: User, color: 'text-purple-400' },
    { label: 'Object', icon: Box, color: 'text-emerald-400' },
    { label: 'Location', icon: MapPin, color: 'text-blue-400' },
    { label: 'Motive', icon: Flame, color: 'text-orange-400' },
    { label: 'Time', icon: Clock, color: 'text-pink-400' },
  ]

  return (
    <div className="flex flex-col gap-3 py-4 border-b border-border">
      <div className="space-y-1">
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          Solution Template Builder
        </Label>
        <p className="text-[10px] text-muted-foreground">
          Draggable tokens allow for dragggable tokens.
        </p>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {tokens.map(token => (
          <Button
            key={token.label}
            variant="outline"
            className="flex h-16 w-full flex-col gap-1 p-1 hover:bg-accent hover:text-accent-foreground items-center justify-center"
            draggable
          >
            <token.icon className={`h-5 w-5 ${token.color}`} />
            <span className="text-[10px]">{token.label}</span>
          </Button>
        ))}
        <Button
          variant="outline"
          className="flex h-16 w-full flex-col gap-1 p-1 hover:bg-accent hover:text-accent-foreground items-center justify-center col-span-1"
        >
          <List className="h-5 w-5 text-muted-foreground" />
          <span className="text-[10px]">Tokens</span>
        </Button>
      </div>
    </div>
  )
}
