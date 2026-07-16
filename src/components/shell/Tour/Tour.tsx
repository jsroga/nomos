'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/AlertDialog'
import { cn } from '@/shared/data/utils'
import type { TourStep } from '@/shared/tours/tour-types'
import { TourStepPosition } from '@/shared/tours/constants/tour-positions'
import {
  TOUR_DEFAULT_MODULE_NAME,
  TOUR_HOOK_ERROR,
  TourDomEvent,
  TourSelectorId,
} from '@/shared/tours/constants/tour-ui'
import { X, ArrowLeft, ArrowRight, Play, SkipForward, XCircle } from 'lucide-react'

export type { TourStep } from '@/shared/tours/tour-types'

interface TourContextType {
  currentStep: number
  totalSteps: number
  nextStep: () => void
  previousStep: () => void
  endTour: () => void
  isActive: boolean
  startTour: () => void
  setSteps: (steps: TourStep[]) => void
  steps: TourStep[]
  isTourCompleted: boolean
  setIsTourCompleted: (completed: boolean) => void
}

interface TourProviderProps {
  children: React.ReactNode
  onComplete?: () => void
  className?: string
  isTourCompleted?: boolean
}

const TourContext = createContext<TourContextType | null>(null)

const PADDING = 16
const CONTENT_WIDTH = 300
const CONTENT_HEIGHT = 200

function getElementPosition(id: string) {
  // Special case for body
  if (id === TourSelectorId.Body) {
    return {
      top: 0,
      left: 0,
      width: window.innerWidth,
      height: window.innerHeight,
    }
  }

  const element = document.getElementById(id)
  if (!element) {
    console.warn(`[Tour] Element with id '${id}' not found`)
    return null
  }
  const rect = element.getBoundingClientRect()
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
    width: rect.width,
    height: rect.height,
  }
}

function calculateContentPosition(
  elementPos: { top: number; left: number; width: number; height: number },
  position: `${TourStepPosition}` = TourStepPosition.Bottom
) {
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  let left = elementPos.left
  let top = elementPos.top

  switch (position) {
    case TourStepPosition.Top:
      top = elementPos.top - CONTENT_HEIGHT - PADDING
      left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2
      break
    case TourStepPosition.Bottom:
      top = elementPos.top + elementPos.height + PADDING
      left = elementPos.left + elementPos.width / 2 - CONTENT_WIDTH / 2
      break
    case TourStepPosition.Left:
      left = elementPos.left - CONTENT_WIDTH - PADDING
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2
      break
    case TourStepPosition.Right:
      left = elementPos.left + elementPos.width + PADDING
      top = elementPos.top + elementPos.height / 2 - CONTENT_HEIGHT / 2
      break
    case TourStepPosition.Center:
      // Center the content in the viewport
      left = (viewportWidth - CONTENT_WIDTH) / 2
      top = (viewportHeight - CONTENT_HEIGHT) / 2
      break
  }

  return {
    top: Math.max(PADDING, Math.min(top, viewportHeight - CONTENT_HEIGHT - PADDING)),
    left: Math.max(PADDING, Math.min(left, viewportWidth - CONTENT_WIDTH - PADDING)),
    width: CONTENT_WIDTH,
    height: CONTENT_HEIGHT,
  }
}

export function TourProvider({
  children,
  onComplete,
  className,
  isTourCompleted = false,
}: TourProviderProps) {
  const [steps, setSteps] = useState<TourStep[]>([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [elementPosition, setElementPosition] = useState<{
    top: number
    left: number
    width: number
    height: number
  } | null>(null)
  const [isCompleted, setIsCompleted] = useState(isTourCompleted)

  const nextStep = useCallback(async () => {
    setCurrentStep(prev => {
      if (prev >= steps.length - 1) {
        return -1
      }
      return prev + 1
    })

    if (currentStep === steps.length - 1) {
      setIsTourCompleted(true)
      onComplete?.()
    }
  }, [steps.length, onComplete, currentStep])

  const previousStep = useCallback(() => {
    setCurrentStep(prev => (prev > 0 ? prev - 1 : prev))
  }, [])

  const updateElementPosition = useCallback(() => {
    if (currentStep >= 0 && currentStep < steps.length) {
      const position = getElementPosition(steps[currentStep]?.selectorId ?? '')
      if (position) {
        setElementPosition(position)
      } else {
        // If element not found, retry after a short delay for dynamically rendered elements
        setTimeout(() => {
          const retryPosition = getElementPosition(steps[currentStep]?.selectorId ?? '')
          if (retryPosition) {
            setElementPosition(retryPosition)
          }
        }, 500)
      }
    }
  }, [currentStep, steps])

  useEffect(() => {
    updateElementPosition()
    window.addEventListener(TourDomEvent.Resize, updateElementPosition)
    window.addEventListener(TourDomEvent.Scroll, updateElementPosition)
    window.addEventListener(TourDomEvent.Click, updateElementPosition)

    // Add ResizeObserver for the target element
    let observer: ResizeObserver | null = null
    const targetId = steps[currentStep]?.selectorId
    if (targetId) {
      const element = document.getElementById(targetId)
      if (element) {
        observer = new ResizeObserver(() => {
          updateElementPosition()
        })
        observer.observe(element)
      }
    }

    // Execute step action if present
    if (currentStep >= 0 && steps[currentStep]?.action) {
      steps[currentStep].action?.()
    }

    return () => {
      window.removeEventListener(TourDomEvent.Resize, updateElementPosition)
      window.removeEventListener(TourDomEvent.Scroll, updateElementPosition)
      window.removeEventListener(TourDomEvent.Click, updateElementPosition)
      if (observer) {
        observer.disconnect()
      }
    }
  }, [updateElementPosition, currentStep, steps])

  // Listener for auto-advance events
  useEffect(() => {
    const activeStep = steps[currentStep]
    if (currentStep >= 0 && activeStep?.advanceEvent) {
      const eventName = activeStep.advanceEvent
      const handler = () => {
        nextStep()
      }
      window.addEventListener(eventName, handler)
      return () => window.removeEventListener(eventName, handler)
    }
  }, [currentStep, steps, nextStep])

  const endTour = useCallback(() => {
    setCurrentStep(-1)
  }, [])

  const startTour = useCallback(() => {
    if (isTourCompleted) {
      return
    }
    setCurrentStep(0)
  }, [isTourCompleted])

  const handleClick = useCallback(
    (e: MouseEvent) => {
      if (currentStep >= 0 && elementPosition && steps[currentStep]?.onClickWithinArea) {
        const clickX = e.clientX + window.scrollX
        const clickY = e.clientY + window.scrollY

        const isWithinBounds =
          clickX >= elementPosition.left &&
          clickX <= elementPosition.left + (steps[currentStep]?.width || elementPosition.width) &&
          clickY >= elementPosition.top &&
          clickY <= elementPosition.top + (steps[currentStep]?.height || elementPosition.height)

        if (isWithinBounds) {
          steps[currentStep].onClickWithinArea?.()
        }
      }
    },
    [currentStep, elementPosition, steps]
  )

  useEffect(() => {
    window.addEventListener(TourDomEvent.Click, handleClick)
    return () => {
      window.removeEventListener(TourDomEvent.Click, handleClick)
    }
  }, [handleClick])

  const setIsTourCompleted = useCallback((completed: boolean) => {
    setIsCompleted(completed)
  }, [])

  return (
    <TourContext.Provider
      value={{
        currentStep,
        totalSteps: steps.length,
        nextStep,
        previousStep,
        endTour,
        isActive: currentStep >= 0,
        startTour,
        setSteps,
        steps,
        isTourCompleted: isCompleted,
        setIsTourCompleted,
      }}
    >
      {children}
      <AnimatePresence>
        {currentStep >= 0 && elementPosition && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 overflow-hidden bg-black/50"
              style={{
                clipPath: `polygon(
                  0% 0%,                                                                          /* top-left */
                  0% 100%,                                                                        /* bottom-left */
                  100% 100%,                                                                      /* bottom-right */
                  100% 0%,                                                                        /* top-right */
                  
                  /* Create rectangular hole */
                  ${elementPosition.left}px 0%,                                                   /* top edge start */
                  ${elementPosition.left}px ${elementPosition.top}px,                             /* hole top-left */
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top}px,  /* hole top-right */
                  ${elementPosition.left + (steps[currentStep]?.width || elementPosition.width)}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,  /* hole bottom-right */
                  ${elementPosition.left}px ${elementPosition.top + (steps[currentStep]?.height || elementPosition.height)}px,  /* hole bottom-left */
                  ${elementPosition.left}px 0%                                                    /* back to top edge */
                )`,
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'absolute',
                top: elementPosition.top,
                left: elementPosition.left,
                width: steps[currentStep]?.width || elementPosition.width,
                height: steps[currentStep]?.height || elementPosition.height,
              }}
              className={cn('z-[100] border-2 border-muted-foreground pointer-events-none', className)}
            />

            <motion.div
              initial={{ opacity: 0, y: 10, top: 50, right: 50 }}
              animate={{
                opacity: 1,
                y: 0,
                top: calculateContentPosition(elementPosition, steps[currentStep]?.position).top,
                left: calculateContentPosition(elementPosition, steps[currentStep]?.position).left,
              }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
                opacity: { duration: 0.4 },
              }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                position: 'absolute',
                width: calculateContentPosition(elementPosition, steps[currentStep]?.position)
                  .width,
              }}
              className="bg-background relative z-[100] rounded-lg border p-4 shadow-lg"
            >
              <div className="text-muted-foreground absolute right-4 top-4 text-xs flex items-center gap-2">
                <span>{currentStep + 1} / {steps.length}</span>
                <button
                  onClick={endTour}
                  className="hover:text-foreground transition-colors p-1 -mr-2 -mt-1"
                  aria-label="Close tour"
                >
                  <X size={14} />
                </button>
              </div>
              <AnimatePresence mode="wait">
                <div>
                  <motion.div
                    key={`tour-content-${currentStep}`}
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.95, filter: 'blur(4px)' }}
                    className="overflow-hidden"
                    transition={{
                      duration: 0.2,
                      height: {
                        duration: 0.4,
                      },
                    }}
                  >
                    {steps[currentStep]?.content}
                  </motion.div>
                  <div className="mt-4 flex items-center gap-2">
                    {currentStep < steps.length - 1 && (
                      <button
                        onClick={endTour}
                        className="text-xs text-muted-foreground hover:text-foreground mr-auto transition-colors font-medium"
                      >
                        Skip
                      </button>
                    )}
                    {currentStep > 0 && (
                      <button
                        onClick={previousStep}
                        disabled={currentStep === 0}
                        className={cn(
                          'text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-md',
                          currentStep === steps.length - 1 && 'mr-auto' // Push finish button to right if it's the only other button
                        )}
                      >
                        <ArrowLeft size={12} />
                        Prev
                      </button>
                    )}
                    {!steps[currentStep]?.hideNext && (
                      <button
                        onClick={nextStep}
                        className="ml-auto text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-md shadow-sm flex items-center gap-1.5 transition-all hover:scale-105"
                      >
                        {currentStep === steps.length - 1 ? 'Finish' : 'Next'}
                        {currentStep < steps.length - 1 && <ArrowRight size={12} />}
                      </button>
                    )}
                    {steps[currentStep]?.hideNext && (
                      <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
                        <span>Awaiting Action...</span>
                      </div>
                    )}
                  </div>
                </div>
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </TourContext.Provider>
  )
}

export function useTour() {
  const context = useContext(TourContext)
  if (!context) {
    throw new Error(TOUR_HOOK_ERROR)
  }
  return context
}

export function TourAlertDialog({
  isOpen,
  setIsOpen,
  onStartTour,
  onSkip,
  onSkipAll,
  moduleName = TOUR_DEFAULT_MODULE_NAME,
}: {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  onStartTour?: () => void
  onSkip?: () => void
  onSkipAll?: () => void
  moduleName?: string
}) {
  const { startTour, steps, currentStep } = useTour()

  // Only hide if tour is active or no steps configured
  // Don't check isTourCompleted here - ModuleOnboardingController handles route-specific logic
  if (steps.length === 0 || currentStep > -1) {
    return null
  }

  const handleSkip = async () => {
    setIsOpen(false)
    onSkip?.()
  }

  const handleStart = () => {
    // Start the tour first, then close the dialog
    if (onStartTour) {
      onStartTour()
    } else {
      startTour()
    }
    // Small delay to ensure tour starts before dialog closes
    setTimeout(() => {
      setIsOpen(false)
    }, 100)
  }

  const handleSkipAll = () => {
    setIsOpen(false)
    onSkipAll?.()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      // Dialog is being closed (via backdrop click or ESC)
      // Treat as skip
      handleSkip()
    }
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md p-6 bg-black border-gray-800">
        <AlertDialogHeader className="flex flex-col items-center justify-center">
          <div className="relative mb-4">
            <motion.div
              initial={{ scale: 0.7, filter: 'blur(10px)' }}
              animate={{
                scale: 1,
                filter: 'blur(0px)',
              }}
              transition={{
                duration: 0.4,
                ease: 'easeOut',
              }}
              className="w-full aspect-square max-w-[240px] mx-auto"
            >
              <video
                src="/storyteller-tour-graphic.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain drop-shadow-2xl"
              />
            </motion.div>
          </div>
          <AlertDialogTitle className="text-center text-xl font-medium text-white">
            Welcome to {moduleName}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-gray-300 mt-2 text-center text-sm">
            Take a quick tour to learn about the key features and functionality of the{' '}
            {moduleName.toLowerCase()}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="mt-6 space-y-3">
          <button
            onClick={handleStart}
            className="w-full h-12 relative overflow-hidden rounded-md bg-gradient-to-r from-primary via-purple-500 to-primary text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] group flex items-center justify-center"
            style={{
              backgroundSize: '200% 100%',
              backgroundPosition: '0% 50%',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundPosition = '100% 50%'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundPosition = '0% 50%'
            }}
          >
            <Play className="w-4 h-4 mr-2 group-hover:translate-x-0.5 transition-transform" />
            Start Tour
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleSkip}
              className="flex-1 h-10 rounded-md border border-gray-700/50 bg-black/40 hover:bg-gray-800/60 hover:border-gray-600 text-gray-300 hover:text-white transition-all duration-200 backdrop-blur-sm flex items-center justify-center text-sm font-medium"
            >
              <SkipForward className="w-3.5 h-3.5 mr-1.5" />
              Skip
            </button>
            <button
              onClick={handleSkipAll}
              className="flex-1 h-10 rounded-md border border-gray-700/50 bg-black/40 hover:bg-gray-800/60 hover:border-gray-600 text-gray-400 hover:text-gray-200 transition-all duration-200 backdrop-blur-sm text-xs font-medium flex items-center justify-center"
            >
              <XCircle className="w-3 h-3 mr-1.5" />
              Skip All
            </button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
