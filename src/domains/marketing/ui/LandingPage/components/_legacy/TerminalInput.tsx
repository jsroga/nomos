'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { LandingTerminalCopy, LandingTerminalStatus } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'

export function TerminalInput() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<LandingTerminalStatus>(LandingTerminalStatus.Idle)
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus(LandingTerminalStatus.Loading)
    await new Promise(r => setTimeout(r, 1500))
    setStatus(LandingTerminalStatus.Success)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl">
      <div
        className={`relative border transition-all duration-300 ${isFocused ? 'border-primary' : 'border-white/10'} bg-black/60 backdrop-blur-sm rounded-xl overflow-hidden`}
      >
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary/80" />
            <div className="w-2 h-2 rounded-full bg-primary/80" />
            <div className="w-2 h-2 rounded-full bg-primary/80" />
          </div>
          <span className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
            {LandingTerminalCopy.Header}
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="text-primary">&gt;</span>
            <span className="text-white/30">{LandingTerminalCopy.Command}</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-primary font-mono text-sm">&gt;</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={LandingTerminalCopy.Placeholder}
              disabled={status === LandingTerminalStatus.Loading || status === LandingTerminalStatus.Success}
              className="flex-1 bg-transparent text-white placeholder:text-white/20 focus:outline-none font-mono text-sm"
            />
            <AnimatePresence mode="wait">
              {status === LandingTerminalStatus.Success ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-primary font-mono text-xs"
                >
                  {LandingTerminalCopy.Granted}
                </motion.span>
              ) : status === LandingTerminalStatus.Loading ? (
                <span className="text-primary/70 font-mono text-xs animate-pulse">
                  {LandingTerminalCopy.Processing}
                </span>
              ) : (
                <button
                  type="submit"
                  disabled={!email}
                  className="text-primary hover:text-white font-mono text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {LandingTerminalCopy.Execute}
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {status === LandingTerminalStatus.Success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 border border-primary/30 bg-primary/5 font-mono text-xs text-primary rounded-lg"
        >
          {LandingTerminalCopy.SuccessMessage}
        </motion.div>
      )}
    </form>
  )
}
