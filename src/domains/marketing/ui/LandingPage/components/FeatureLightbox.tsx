'use client'

import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { LandingNavUiCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import type { SelectedFeature } from '@/domains/marketing/ui/LandingPage/types'

type FeatureLightboxProps = {
  selectedFeature: SelectedFeature | null
  onClose: () => void
}

export function FeatureLightbox({ selectedFeature, onClose }: FeatureLightboxProps) {
  return (
    <AnimatePresence>
      {selectedFeature && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            onClick={e => e.stopPropagation()}
            className="relative max-w-2xl w-full bg-[#111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-4 z-10">
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-8 md:p-12">
              <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary border border-primary/20">
                {selectedFeature.icon && <selectedFeature.icon size={32} />}
              </div>

              <div className="mb-8">
                <span className="text-xs font-mono text-primary uppercase tracking-widest mb-2 block">
                  {selectedFeature.subtitle}
                </span>
                <h3 className="text-3xl md:text-4xl font-black text-white font-syne mb-4">
                  {selectedFeature.title}
                </h3>
                <p className="text-lg text-white/70 font-mono leading-relaxed">
                  {selectedFeature.description}
                </p>
              </div>

              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-white/90 transition-colors uppercase tracking-wide text-sm font-syne"
              >
                {LandingNavUiCopy.CloseDetails}
              </button>
            </div>

            <div className="absolute -right-12 -bottom-12 opacity-[0.03] pointer-events-none">
              {selectedFeature.icon && <selectedFeature.icon size={300} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
