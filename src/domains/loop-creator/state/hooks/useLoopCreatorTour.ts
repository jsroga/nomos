'use client'

import { useTour } from '@/components/shell/Tour'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'

export function useLoopCreatorTour() {
  const { currentStep } = useTour()

  return {
    isTourActive: currentStep >= 0,
    tourIds: TOUR_STEP_IDS,
  }
}
