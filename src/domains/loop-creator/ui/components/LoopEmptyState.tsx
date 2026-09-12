'use client'

import { Button } from '@/components/Button'
import { ButtonSizeKey, ButtonVariantKey } from '@/components/Button/constants/button-styles'
import { Sparkles } from 'lucide-react'
import { motion } from 'motion/react'
import {
  LOOP_EMPTY_STATE_CTA_CLASS,
  LoopEmptyCopy,
} from '@/domains/loop-creator/constants/loop-empty-state'

interface LoopEmptyStateProps {
  onCreateLoop: () => void
}

export function LoopEmptyState({ onCreateLoop }: LoopEmptyStateProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center overflow-y-auto p-4">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative max-w-xl text-center px-4"
      >
        <div className="relative border border-zinc-800 bg-black/95 backdrop-blur-xl p-8 rounded-2xl shadow-2xl">
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
              {LoopEmptyCopy.Badge}
            </span>
          </div>

          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">{LoopEmptyCopy.Title}</h2>

          <p className="text-zinc-400 mb-8 leading-relaxed max-w-md mx-auto font-light">
            {LoopEmptyCopy.Description}
          </p>

          <div className="flex justify-center gap-8 mb-8 text-xs font-mono">
            <div className="text-zinc-600">
              <span className="text-primary/60">{LoopEmptyCopy.SpecMicroIndex}</span>{' '}
              {LoopEmptyCopy.SpecMicro}
            </div>
            <div className="text-zinc-600">
              <span className="text-primary/60">{LoopEmptyCopy.SpecCoreIndex}</span>{' '}
              {LoopEmptyCopy.SpecCore}
            </div>
            <div className="text-zinc-600">
              <span className="text-primary/60">{LoopEmptyCopy.SpecSessionIndex}</span>{' '}
              {LoopEmptyCopy.SpecSession}
            </div>
            <div className="text-zinc-600">
              <span className="text-primary/60">{LoopEmptyCopy.SpecMetaIndex}</span>{' '}
              {LoopEmptyCopy.SpecMeta}
            </div>
          </div>

          <Button
            size={ButtonSizeKey.Lg}
            variant={ButtonVariantKey.Outline}
            onClick={onCreateLoop}
            className={LOOP_EMPTY_STATE_CTA_CLASS}
          >
            <Sparkles className="w-5 h-5" />
            {LoopEmptyCopy.Cta}
          </Button>

          <p className="text-[11px] text-zinc-600 mt-6 font-mono">{LoopEmptyCopy.Hint}</p>
        </div>

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-4 -right-4 w-2 h-2 bg-primary/40 rounded-full"
        />
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-4 -left-4 w-3 h-3 border border-zinc-800 rounded-full"
        />
      </motion.div>
    </div>
  )
}
