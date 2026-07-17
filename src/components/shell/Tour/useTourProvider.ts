'use client'

import { useCallback, useEffect, useState } from 'react'
import type { TourStep } from '@/shared/tours/tour-types'
import {
  getElementPosition,
  isClickWithinTourArea,
  TourDomEvent,
  type ElementPosition,
} from './tour-position'

interface UseTourProviderOptions {
  onComplete?: () => void
  isTourCompleted?: boolean
}

export function useTourProvider({ onComplete, isTourCompleted = false }: UseTourProviderOptions) {
  const [steps, setSteps] = useState<TourStep[]>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [elementPosition, setElementPosition] = useState<ElementPosition | null>(null)
  const [isCompleted, setIsCompleted] = useState(isTourCompleted)

  const nextStep = useCallback(async () => {
    setCurrentStep(prev => {
      if (prev >= steps.length - 1) {
        return -1
      }
      return prev + 1
    })

    if (currentStep === steps.length - 1) {
      setIsCompleted(true)
      onComplete?.()
    }
  }, [steps.length, onComplete, currentStep])

  const previousStep = useCallback(() => {
    setCurrentStep(prev => (prev > 0 ? prev - 1 : prev))
  }, [])

  const endTour = useCallback(() => {
    setCurrentStep(-1)
  }, [])

  const startTour = useCallback(() => {
    if (isTourCompleted) return
    setCurrentStep(0)
  }, [isTourCompleted])

  const setIsTourCompleted = useCallback((completed: boolean) => {
    setIsCompleted(completed)
  }, [])

  const updateElementPosition = useCallback(() => {
    if (currentStep < 0 || currentStep >= steps.length) return

    const position = getElementPosition(steps[currentStep]?.selectorId ?? '')
    if (position) {
      setElementPosition(position)
      return
    }

    setTimeout(() => {
      const retryPosition = getElementPosition(steps[currentStep]?.selectorId ?? '')
      if (retryPosition) setElementPosition(retryPosition)
    }, 500)
  }, [currentStep, steps])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      updateElementPosition()
    })
    window.addEventListener(TourDomEvent.Resize, updateElementPosition)
    window.addEventListener(TourDomEvent.Scroll, updateElementPosition)
    window.addEventListener(TourDomEvent.Click, updateElementPosition)

    let observer: ResizeObserver | null = null
    const targetId = steps[currentStep]?.selectorId
    if (targetId) {
      const element = document.getElementById(targetId)
      if (element) {
        observer = new ResizeObserver(updateElementPosition)
        observer.observe(element)
      }
    }

    if (currentStep >= 0 && steps[currentStep]?.action) {
      steps[currentStep].action?.()
    }

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener(TourDomEvent.Resize, updateElementPosition)
      window.removeEventListener(TourDomEvent.Scroll, updateElementPosition)
      window.removeEventListener(TourDomEvent.Click, updateElementPosition)
      observer?.disconnect()
    }
  }, [updateElementPosition, currentStep, steps])

  useEffect(() => {
    const activeStep = steps[currentStep]
    const eventName = activeStep?.advanceEvent
    if (currentStep < 0 || !eventName) return

    const handler = () => nextStep()
    window.addEventListener(eventName, handler)
    return () => window.removeEventListener(eventName, handler)
  }, [currentStep, steps, nextStep])

  const handleClick = useCallback(
    (e: MouseEvent) => {
      const activeStep = steps[currentStep]
      if (currentStep < 0 || !elementPosition || !activeStep?.onClickWithinArea) return

      if (isClickWithinTourArea(e, elementPosition, activeStep.width, activeStep.height)) {
        activeStep.onClickWithinArea()
      }
    },
    [currentStep, elementPosition, steps],
  )

  useEffect(() => {
    window.addEventListener(TourDomEvent.Click, handleClick)
    return () => window.removeEventListener(TourDomEvent.Click, handleClick)
  }, [handleClick])

  return {
    steps,
    setSteps,
    currentStep,
    elementPosition,
    isCompleted,
    nextStep,
    previousStep,
    endTour,
    startTour,
    setIsTourCompleted,
  }
}
