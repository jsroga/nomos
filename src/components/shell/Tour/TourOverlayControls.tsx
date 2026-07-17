'use client'

import { ArrowLeft, ArrowRight } from 'lucide-react'
import { cn } from '@/shared/data/utils'

interface TourOverlayControlsProps {
  currentStep: number
  totalSteps: number
  hideNext?: boolean
  onNext: () => void
  onPrevious: () => void
  onEnd: () => void
}

export function TourOverlayControls({
  currentStep,
  totalSteps,
  hideNext,
  onNext,
  onPrevious,
  onEnd,
}: TourOverlayControlsProps) {
  const isLastStep = currentStep === totalSteps - 1

  return (
    <div className="mt-4 flex items-center gap-2">
      {!isLastStep && (
        <button
          onClick={onEnd}
          className="text-xs text-muted-foreground hover:text-foreground mr-auto transition-colors font-medium"
        >
          Skip
        </button>
      )}
      {currentStep > 0 && (
        <button
          onClick={onPrevious}
          disabled={currentStep === 0}
          className={cn(
            'text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors bg-secondary/50 hover:bg-secondary px-3 py-1.5 rounded-md',
            isLastStep && 'mr-auto',
          )}
        >
          <ArrowLeft size={12} />
          Prev
        </button>
      )}
      {!hideNext && (
        <button
          onClick={onNext}
          className="ml-auto text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 px-4 py-1.5 rounded-md shadow-sm flex items-center gap-1.5 transition-all hover:scale-105"
        >
          {isLastStep ? 'Finish' : 'Next'}
          {!isLastStep && <ArrowRight size={12} />}
        </button>
      )}
      {hideNext && (
        <div className="ml-auto flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest animate-pulse">
          <span>Awaiting Action...</span>
        </div>
      )}
    </div>
  )
}
