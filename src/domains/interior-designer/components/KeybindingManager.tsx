'use client'

import React, { useEffect } from 'react'
import { useInteriorStore } from '@/domains/interior-designer/store/useInteriorStore'

export const KeybindingManager: React.FC = () => {
  const selectedId = useInteriorStore(state => state.selectedId)
  const setSelected = useInteriorStore(state => state.setSelected)

  const walls = useInteriorStore(state => state.walls)
  const floors = useInteriorStore(state => state.floors)
  const surfaces = useInteriorStore(state => state.surfaces)
  const objects = useInteriorStore(state => state.objects)

  const removeWall = useInteriorStore(state => state.removeWall)
  const removeFloor = useInteriorStore(state => state.removeFloor)
  const removeSurface = useInteriorStore(state => state.removeSurface)
  const removeObject = useInteriorStore(state => state.removeObject)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!selectedId) return

        // Check what type of item it is to delete it
        if (walls.some(w => w.id === selectedId)) {
          removeWall(selectedId)
        } else if (floors.some(f => f.id === selectedId)) {
          removeFloor(selectedId)
        } else if (surfaces.some(s => s.id === selectedId)) {
          removeSurface(selectedId)
        } else if (objects.some(o => o.id === selectedId)) {
          removeObject(selectedId)
        }

        setSelected(null)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedId,
    walls,
    floors,
    surfaces,
    objects,
    removeWall,
    removeFloor,
    removeSurface,
    removeObject,
    setSelected,
  ])

  return null
}
