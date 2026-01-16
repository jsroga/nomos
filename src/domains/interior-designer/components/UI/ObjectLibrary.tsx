'use client'

import React from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Box, Circle, Cylinder, Cone, X, LayoutGrid, DoorOpen } from 'lucide-react'

const MODELS = [
  { id: 'cube', name: 'Cube', icon: Box },
  { id: 'sphere', name: 'Sphere', icon: Circle },
  { id: 'cylinder', name: 'Cylinder', icon: Cylinder },
  { id: 'cone', name: 'Cone', icon: Cone },
  { id: 'window', name: 'Window', icon: LayoutGrid },
  { id: 'door', name: 'Door', icon: DoorOpen },
]

export const ObjectLibrary: React.FC = () => {
  const activeModelUrl = useInteriorStore(state => state.activeModelUrl)
  const setActiveModelUrl = useInteriorStore(state => state.setActiveModelUrl)
  const mode = useInteriorStore(state => state.mode)
  const setMode = useInteriorStore(state => state.setMode)

  if (mode !== 'OBJECT' && mode !== 'SCATTER') return null

  const handleClose = () => {
    setMode('SELECT')
  }

  return (
    <div className="absolute left-16 top-14 bg-background border border-border rounded-md shadow-lg p-2 w-48 z-10 max-h-[80vh] overflow-hidden">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-sm font-medium">Object Library</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleClose}>
          <X size={14} />
        </Button>
      </div>
      <ScrollArea className="h-80">
        <div className="grid grid-cols-2 gap-2 p-1">
          {MODELS.map(model => (
            <Button
              key={model.id}
              variant={activeModelUrl === model.id ? 'default' : 'outline'}
              className="h-16 flex flex-col gap-1"
              onClick={() => setActiveModelUrl(model.id)}
            >
              <model.icon size={20} />
              <span className="text-xs">{model.name}</span>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
