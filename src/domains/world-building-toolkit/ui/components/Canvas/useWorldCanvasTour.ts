import { useEffect } from 'react'
import { useTour } from '@/components/shell/Tour'
import { useWorldStore } from '@/domains/world-building-toolkit'

const CANVAS_TOUR_STEP_INDEX = 1

export function useWorldCanvasTour(): void {
  const { currentStep, isActive: isTourOpen } = useTour()
  const selectedTile = useWorldStore(state => state.selectedTile)
  const setSelectedTile = useWorldStore(state => state.setSelectedTile)

  useEffect(() => {
    if (isTourOpen && currentStep === CANVAS_TOUR_STEP_INDEX) {
      if (!selectedTile || selectedTile.x !== 0 || selectedTile.y !== 0) {
        setSelectedTile({ x: 0, y: 0 })
      }
    }
  }, [currentStep, isTourOpen, selectedTile, setSelectedTile])
}
