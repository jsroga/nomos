'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, ArrowRight, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'react-hot-toast'

export function WaitlistForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [joined, setJoined] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setLoading(true)
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (res.ok) {
        setJoined(true)
        toast.success('You\'re on the list!')
      } else {
        const data = await res.json()
        toast.error(data.error || 'Something went wrong.')
      }
    } catch (error) {
      toast.error('Failed to join waitlist.')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm mr-auto">
      <AnimatePresence mode="wait">
        {!joined ? (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="liquid-blob flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 text-white placeholder:text-white/30 transition-all hover:bg-white/10"
            />
            <Button
              type="submit"
              disabled={loading}
              className="liquid-blob h-[--height] py-3 bg-white text-black hover:bg-white/90 font-bold shadow-lg shadow-white/10 transition-all hover:scale-105 active:scale-95"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Join Waitlist <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-2 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400"
          >
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mb-1">
              <Check className="w-6 h-6" />
            </div>
            <p className="font-semibold">You're on the list!</p>
            <p className="text-sm opacity-80">We'll let you know when we open up.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
