'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Plus, ArrowRight } from 'lucide-react'
import { motion } from 'framer-motion'

interface LoopEmptyStateProps {
  onCreateLoop: () => void
}

export function LoopEmptyState({ onCreateLoop }: LoopEmptyStateProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center z-10">
      {/* Subtle grid background */}
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
        className="relative max-w-xl text-center px-8"
      >
        {/* Technical card container */}
        <div className="relative border border-white/5 bg-black/40 backdrop-blur-sm p-12 rounded-2xl overflow-hidden">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-12 h-12 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-2xl" />
          <div className="absolute bottom-0 right-0 w-12 h-12 border-b-2 border-r-2 border-cyan-500/30 rounded-br-2xl" />

          {/* Code badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full mb-6">
            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">
              LOP_DES
            </span>
          </div>

          {/* Title */}
          <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
            Game Loop Architecture
          </h2>

          {/* Description */}
          <p className="text-white/40 mb-8 leading-relaxed max-w-md mx-auto font-light">
            Design compulsion loops that hook players. Psychology-driven mechanics. Challenge →
            Action → Feedback cycles that define genres.
          </p>

          {/* Technical specs */}
          <div className="flex justify-center gap-8 mb-10 text-xs font-mono">
            <div className="text-white/30">
              <span className="text-cyan-400/60">01</span> MICRO
            </div>
            <div className="text-white/30">
              <span className="text-cyan-400/60">02</span> CORE
            </div>
            <div className="text-white/30">
              <span className="text-cyan-400/60">03</span> SESSION
            </div>
            <div className="text-white/30">
              <span className="text-cyan-400/60">04</span> META
            </div>
          </div>

          {/* CTA Button */}
          <Button
            size="lg"
            onClick={onCreateLoop}
            className="group gap-3 px-8 bg-white text-black hover:bg-white/90 transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            <span className="font-medium">Initialize Loop</span>
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </Button>

          {/* Subtle hint */}
          <p className="text-[11px] text-white/20 mt-6 font-mono">
            CTRL+N to quick-create • JSON import available
          </p>
        </div>

        {/* Floating decorative elements */}
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-4 -right-4 w-2 h-2 bg-cyan-500/40 rounded-full"
        />
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute -bottom-4 -left-4 w-3 h-3 border border-white/10 rounded-full"
        />
      </motion.div>
    </div>
  )
}
