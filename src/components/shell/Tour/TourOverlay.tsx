'use client'

import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { cn } from '@/shared/data/utils'
import type { TourStep } from '@/shared/tours/tour-types'
import {
  buildTourClipPath,
  calculateContentPosition,
  type ElementPosition,
} from './tour-position'
import { TourOverlayControls } from './TourOverlayControls'

interface TourOverlayProps {
  currentStep: number
  steps: TourStep[]
  elementPosition: ElementPosition
  className?: string
  onNext: () => void
  onPrevious: () => void
  onEnd: () => void
}

export function TourOverlay({
  currentStep,
  steps,
  elementPosition,
  className,
  onNext,
  onPrevious,
  onEnd,
}: TourOverlayProps) {
  const activeStep = steps[currentStep]
  const highlightWidth = activeStep?.width || elementPosition.width
  const highlightHeight = activeStep?.height || elementPosition.height
  const contentPosition = calculateContentPosition(elementPosition, activeStep?.position)

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 z-50 overflow-hidden bg-black/50"
        style={{ clipPath: buildTourClipPath(elementPosition, activeStep?.width, activeStep?.height) }}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        style={{
          position: 'absolute',
          top: elementPosition.top,
          left: elementPosition.left,
          width: highlightWidth,
          height: highlightHeight,
        }}
        className={cn('z-[100] border-2 border-muted-foreground pointer-events-none', className)}
      />
      <motion.div
        initial={{ opacity: 0, y: 10, top: 50, right: 50 }}
        animate={{
          opacity: 1,
          y: 0,
          top: contentPosition.top,
          left: contentPosition.left,
        }}
        transition={{
          duration: 0.8,
          ease: [0.16, 1, 0.3, 1],
          opacity: { duration: 0.4 },
        }}
        exit={{ opacity: 0, y: 10 }}
        style={{ position: 'absolute', width: contentPosition.width }}
        className="bg-background relative z-[100] rounded-lg border p-4 shadow-lg"
      >
        <div className="text-muted-foreground absolute right-4 top-4 text-xs flex items-center gap-2">
          <span>
            {currentStep + 1} / {steps.length}
          </span>
          <button
            onClick={onEnd}
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
              transition={{ duration: 0.2, height: { duration: 0.4 } }}
            >
              {activeStep?.content}
            </motion.div>
            <TourOverlayControls
              currentStep={currentStep}
              totalSteps={steps.length}
              hideNext={activeStep?.hideNext}
              onNext={onNext}
              onPrevious={onPrevious}
              onEnd={onEnd}
            />
          </div>
        </AnimatePresence>
      </motion.div>
    </>
  )
}
