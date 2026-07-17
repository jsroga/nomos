'use client'

import { AnimatePresence, motion } from 'motion/react'
import type React from 'react'
import { createContext, useContext } from 'react'

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/AlertDialog'
import type { TourStep } from '@/shared/tours/tour-types'
import {
  TOUR_DEFAULT_MODULE_NAME,
  TOUR_HOOK_ERROR,
} from '@/shared/tours/constants/tour-ui'
import { Play, SkipForward, XCircle } from 'lucide-react'
import { TourOverlay } from './TourOverlay'
import { useTourProvider } from './useTourProvider'

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

export function TourProvider({
  children,
  onComplete,
  className,
  isTourCompleted = false,
}: TourProviderProps) {
  const tour = useTourProvider({ onComplete, isTourCompleted })

  return (
    <TourContext.Provider
      value={{
        currentStep: tour.currentStep,
        totalSteps: tour.steps.length,
        nextStep: tour.nextStep,
        previousStep: tour.previousStep,
        endTour: tour.endTour,
        isActive: tour.currentStep >= 0,
        startTour: tour.startTour,
        setSteps: tour.setSteps,
        steps: tour.steps,
        isTourCompleted: tour.isCompleted,
        setIsTourCompleted: tour.setIsTourCompleted,
      }}
    >
      {children}
      <AnimatePresence>
        {tour.currentStep >= 0 && tour.elementPosition && (
          <TourOverlay
            currentStep={tour.currentStep}
            steps={tour.steps}
            elementPosition={tour.elementPosition}
            className={className}
            onNext={tour.nextStep}
            onPrevious={tour.previousStep}
            onEnd={tour.endTour}
          />
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

  if (steps.length === 0 || currentStep > -1) {
    return null
  }

  const handleSkip = async () => {
    setIsOpen(false)
    onSkip?.()
  }

  const handleStart = () => {
    if (onStartTour) {
      onStartTour()
    } else {
      startTour()
    }
    setTimeout(() => setIsOpen(false), 100)
  }

  const handleSkipAll = () => {
    setIsOpen(false)
    onSkipAll?.()
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) handleSkip()
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-md p-6 bg-black border-gray-800">
        <AlertDialogHeader className="flex flex-col items-center justify-center">
          <div className="relative mb-4">
            <motion.div
              initial={{ scale: 0.7, filter: 'blur(10px)' }}
              animate={{ scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
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
            style={{ backgroundSize: '200% 100%', backgroundPosition: '0% 50%' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundPosition = '100% 50%'
            }}
            onMouseLeave={e => {
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
