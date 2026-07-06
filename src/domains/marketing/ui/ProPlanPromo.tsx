'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Check, Sparkles } from 'lucide-react'

export const ProPlanPromo = () => {
  return (
    <section className="py-24 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="relative group rounded-3xl p-[2px] overflow-hidden transform hover:scale-[1.01] transition-transform duration-500">
          {/* Base subtle border glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#ff4400]/30 via-transparent to-primary/30 opacity-60" />

          {/* Traveling glow orb - moves around border */}
          <motion.div
            className="absolute w-[200px] h-[200px] rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle, rgba(255,68,0,0.9) 0%, rgba(255,68,0,0.4) 30%, transparent 70%)',
              filter: 'blur(20px)',
            }}
            animate={{
              // Travel path: top-left → top-right → bottom-right → bottom-left → top-left
              x: ['-100px', 'calc(100% - 100px)', 'calc(100% - 100px)', '-100px', '-100px'],
              y: ['-100px', '-100px', 'calc(100% - 100px)', 'calc(100% - 100px)', '-100px'],
            }}
            transition={{
              duration: 8,
              ease: [0.4, 0, 0.2, 1], // Smooth cubic-bezier
              repeat: Infinity,
              repeatDelay: 2, // Pause between loops
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          />

          {/* Secondary smaller orb for depth - opposite direction */}
          <motion.div
            className="absolute w-[120px] h-[120px] rounded-full pointer-events-none opacity-60"
            style={{
              background:
                'radial-gradient(circle, rgba(92,124,250,0.8) 0%, rgba(92,124,250,0.3) 40%, transparent 70%)',
              filter: 'blur(15px)',
            }}
            animate={{
              x: ['calc(100% - 60px)', '-60px', '-60px', 'calc(100% - 60px)', 'calc(100% - 60px)'],
              y: ['-60px', '-60px', 'calc(100% - 60px)', 'calc(100% - 60px)', '-60px'],
            }}
            transition={{
              duration: 10,
              ease: [0.25, 0.1, 0.25, 1],
              repeat: Infinity,
              repeatDelay: 1,
              times: [0, 0.25, 0.5, 0.75, 1],
            }}
          />

          {/* Inner Content Card */}
          <div className="relative bg-[#050505] rounded-[22px] p-8 md:p-12 h-full flex flex-col md:flex-row items-center gap-12 overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />

            <div className="flex-1 space-y-6 relative z-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#ff4400] text-white text-[10px] font-mono font-bold uppercase tracking-widest">
                <Sparkles className="w-3 h-3" />
                Limited Time Offer
              </div>

              <h2 className="text-4xl md:text-5xl font-black font-syne text-white leading-tight">
                Unlock everything with the{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ff4400] to-primary">
                  Pro Plan.
                </span>
              </h2>

              <div className="space-y-4">
                {[
                  'Premium AI Models (GPT-5.2)',
                  'Full Developer API Access',
                  'Priority Generation Queue',
                  'Commercial Studio License',
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
                      <Check className="w-3 h-3 text-[#ff4400]" />
                    </div>
                    <span className="font-mono text-sm text-white/80">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing/CTA Side */}
            <div className="w-full md:w-auto min-w-[300px] relative z-10">
              <div className="bg-white rounded-2xl p-6 text-black shadow-2xl">
                <div className="flex flex-col gap-1 mb-6">
                  <span className="text-xs font-mono uppercase tracking-wider text-black/50">
                    Pro Plan
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black font-syne tracking-tighter">$0</span>
                    <span className="text-lg font-bold text-black/40 line-through">$29</span>
                    <span className="text-sm font-mono text-black/60">/mo</span>
                  </div>
                  <span className="text-xs text-[#ff4400] font-bold mt-1">
                    Free for Early Adopters
                  </span>
                </div>

                <Link
                  href="/login"
                  className="w-full py-4 bg-black text-white rounded-lg font-bold hover:bg-[#ff4400] transition-colors duration-300 flex items-center justify-center gap-2 group"
                >
                  Claim Free Access
                  <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                </Link>
                <p className="text-[10px] text-center mt-3 text-black/40 font-mono">
                  No credit card required. Cancel anytime.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
