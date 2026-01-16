'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useSpring, AnimatePresence } from 'framer-motion'
import {
  Map,
  Palette,
  Brain,
  Boxes,
  Zap,
  Skull,
  ArrowRight,
  Play,
  Plus,
  Flame,
  Shield,
  X,
  Check,
} from 'lucide-react'
import { TurbulentBackground } from './TurbulentBackground'
import { GlowEffect } from '@/components/ui/glow-effect'
import {
  DecryptedText,
  MotionHighlight,
  LiquidDistortionText,
  AggressiveGlitchText,
} from '@/components/ui/text-effects'
import { BleedingText } from './BleedingText'

// ═══════════════════════════════════════════════════════════════════
// FEATURES DATA
// ═══════════════════════════════════════════════════════════════════
const FEATURES = [
  {
    icon: Map,
    title: 'World Generation',
    description:
      'Generate infinite tile-able terrain with AI. Days of work → minutes. Export-ready.',
    accent: '#5c7cfa',
    code: 'WLD_GEN',
  },
  {
    icon: Brain,
    title: 'AI Storyteller',
    description:
      'Auto-generate quests, factions, and narrative arcs. Your AI co-writer that never sleeps.',
    accent: '#5c7cfa',
    code: 'NAR_SYS',
  },
  {
    icon: Palette,
    title: 'Terrain Sculpting',
    description:
      'Shape landscapes with AI-assisted tools. Mountains, rivers, dungeons. Fast iteration.',
    accent: '#5c7cfa',
    code: 'TER_SCL',
  },
  {
    icon: Boxes,
    title: 'One-Click Export',
    description:
      'GLTF, Unity, Unreal. Production-ready assets straight into your engine. No conversion hassle.',
    accent: '#5c7cfa',
    code: 'EXP_SYS',
  },
  {
    icon: Zap,
    title: 'Game Loop Designer',
    description:
      'AI analyzes successful games to help you design addictive core loops. Data-driven.',
    accent: '#5c7cfa',
    code: 'LOP_DES',
  },
  {
    icon: Flame,
    title: 'Scene Simulator',
    description: 'Test combat, physics, and chaos before you code. Catch issues early.',
    accent: '#5c7cfa',
    code: 'STR_TST',
  },
  {
    icon: Shield,
    title: 'Team Collaboration',
    description: 'Secure asset storage. Role-based access. Built for studios of any size.',
    accent: '#5c7cfa',
    code: 'SEC_AST',
  },
]

const STEPS = [
  {
    icon: Zap,
    title: 'Initialize System',
    description:
      'Connect your dataset and define your world parameters. The AI begins mapping the latent space.',
  },
  {
    icon: Palette,
    title: 'Shape Reality',
    description:
      'Use brutal sculpting tools and procedural generation to carve your vision into existence.',
  },
  {
    icon: Brain,
    title: 'Infuse Life',
    description:
      'Deploy emergent AI narratives and faction systems. Watch your world evolve and react.',
  },
  {
    icon: Boxes,
    title: 'Production Export',
    description:
      'Rip your production-ready assets straight into your engine. Unity, Unreal, or GLTF.',
  },
]

// ═══════════════════════════════════════════════════════════════════
// HERO HEADLINE - 3-line AI-POWERED WORLD BUILDING
// ═══════════════════════════════════════════════════════════════════
const HeadlineVariant = () => {
  return (
    <h1 className="flex flex-col items-center gap-1 font-black uppercase tracking-[-0.02em] font-syne text-white text-center leading-[0.85]">
      <LiquidDistortionText
        text="BUILD"
        className="text-[clamp(2.4rem,8vw,6.4rem)]"
        intensity={15}
      />
      <LiquidDistortionText
        text="WORLDS"
        className="text-[clamp(3rem,10vw,8rem)]"
        intensity={20}
      />
      <BleedingText text="THAT BLEED" />
    </h1>
  )
}

// ═══════════════════════════════════════════════════════════════════
// INTERACTIVE CONCEPT TILE
// ═══════════════════════════════════════════════════════════════════
const ConceptToCarnageTile = () => {
  const [state, setState] = useState<'concept' | 'carnage'>('concept')

  return (
    <motion.div
      onClick={() => setState(prev => (prev === 'concept' ? 'carnage' : 'concept'))}
      className="group relative h-full min-h-[400px] border border-white/5 bg-black/40 backdrop-blur-sm cursor-pointer overflow-hidden rounded-xl"
    >
      <div className="absolute inset-0 z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={state}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.3, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage:
                state === 'concept'
                  ? 'url(https://images.unsplash.com/photo-1614850715649-1d0106293bd1?auto=format&fit=crop&q=80&w=2070)'
                  : 'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=2070)',
            }}
          />
        </AnimatePresence>
      </div>

      <div className="relative z-10 p-8 flex flex-col h-full justify-between">
        <div>
          <span className="font-mono text-[10px] text-primary mb-2 block tracking-widest uppercase">
            [INTERACTIVE_PREVIEW]
          </span>
          <h3 className="text-3xl font-black tracking-wide leading-none mb-4 font-syne">
            From Concept
            <br />
            <span className={state === 'carnage' ? 'text-primary' : 'text-white'}>To Carnage</span>
          </h3>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-white/40">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          CLICK TO EVOLVE_
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// BRUTAL FEATURE CARD
// ═══════════════════════════════════════════════════════════════════
const BrutalCard = ({ feature, index }: { feature: (typeof FEATURES)[0]; index: number }) => {
  const Icon = feature.icon
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      viewport={{ once: true, margin: '-50px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative h-full"
    >
      <div className="relative h-full border border-white/5 bg-black/40 backdrop-blur-sm p-8 transition-all duration-300 hover:border-white/20 rounded-xl overflow-hidden">
        <div
          className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 transition-all duration-300 opacity-20 group-hover:opacity-100"
          style={{ borderColor: feature.accent }}
        />

        <div className="flex items-start justify-between mb-6">
          <div
            className="p-3 border rounded-lg transition-all duration-300"
            style={{
              borderColor: isHovered ? 'rgba(92, 124, 250, 0.4)' : 'rgba(255,255,255,0.1)',
              backgroundColor: isHovered ? 'rgba(92, 124, 250, 0.08)' : 'transparent',
            }}
          >
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <span
            className="font-mono text-[10px] tracking-wider transition-colors duration-300"
            style={{ color: isHovered ? feature.accent : 'rgba(255,255,255,0.3)' }}
          >
            [{feature.code}]
          </span>
        </div>

        <h3 className="text-xl font-black tracking-wide text-white mb-3 font-syne">
          {feature.title}
        </h3>
        <p className="text-white/40 leading-relaxed text-sm font-mono">{feature.description}</p>

        <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 h-3 transition-all duration-300"
                style={{
                  backgroundColor: i <= index % 5 ? feature.accent : 'rgba(255,255,255,0.1)',
                  opacity: isHovered ? 1 : 0.5,
                }}
              />
            ))}
          </div>
          <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
        </div>
      </div>
    </motion.div>
  )
}

const SystemModuleCard = ({ step, index }: { step: (typeof STEPS)[0]; index: number }) => {
  const [bootStatus, setBootStatus] = useState<'IDLE' | 'BOOTING' | 'READY'>('IDLE')
  const [syncId, setSyncId] = useState('')

  useEffect(() => {
    setSyncId(Math.random().toString(16).slice(2, 8).toUpperCase())
    const timer = setTimeout(() => setBootStatus('BOOTING'), index * 400)
    const readyTimer = setTimeout(() => setBootStatus('READY'), index * 400 + 1000)
    return () => {
      clearTimeout(timer)
      clearTimeout(readyTimer)
    }
  }, [index])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group relative p-8 rounded-xl bg-black/40 border border-white/5 hover:border-primary/20 transition-all duration-500 overflow-hidden"
    >
      {/* Module Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <step.icon className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-primary uppercase tracking-widest leading-none">
              MODULE_{index + 1}
            </span>
            <span className="text-[9px] font-mono text-white/20 uppercase tracking-tighter">
              SYS::INFRA_v4
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/5 border border-white/10">
          <div
            className={`w-1 h-1 rounded-full ${bootStatus === 'READY' ? 'bg-primary' : 'bg-primary/50 animate-pulse'
              }`}
          />
          <span className="text-[8px] font-mono text-white/40">{bootStatus}</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        <h3 className="text-xl font-black tracking-wide text-white mb-3 font-syne">
          {bootStatus === 'READY' ? (
            step.title
          ) : (
            <DecryptedText text={step.title} speed={20} maxIterations={2} />
          )}
        </h3>
        <p className="text-white/40 leading-relaxed text-sm font-mono">{step.description}</p>
      </div>

      {/* Technical Readout */}
      <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between opacity-30 group-hover:opacity-100 transition-opacity">
        <div className="flex gap-1">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`w-4 h-1 rounded-full ${i <= index ? 'bg-primary' : 'bg-white/10'}`}
            />
          ))}
        </div>
        <span className="text-[8px] font-mono text-white/50 tracking-widest">
          SYNC_PROTOCOL://{syncId || 'LOADING...'}
        </span>
      </div>

      {/* Background Decor */}
      <div className="absolute top-0 right-0 p-8 pointer-events-none">
        <span className="text-6xl font-black text-white/[0.02] group-hover:text-primary/5 transition-colors font-syne">
          {(index + 1).toString().padStart(2, '0')}
        </span>
      </div>
    </motion.div>
  )
}

const ScannerLine = () => (
  <motion.div
    animate={{ y: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
    transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
    className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary/40 to-transparent z-20 pointer-events-none"
  />
)

// ═══════════════════════════════════════════════════════════════════
// TERMINAL INPUT
// ═══════════════════════════════════════════════════════════════════
const TerminalInput = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [isFocused, setIsFocused] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

    setStatus('loading')
    await new Promise(r => setTimeout(r, 1500))
    setStatus('success')
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
            TERMINAL::ACCESS_REQUEST
          </span>
        </div>

        <div className="p-4">
          <div className="flex items-center gap-3 font-mono text-sm">
            <span className="text-primary">&gt;</span>
            <span className="text-white/30">request_access --email</span>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-primary font-mono text-sm">&gt;</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder="your@email.com"
              disabled={status === 'loading' || status === 'success'}
              className="flex-1 bg-transparent text-white placeholder:text-white/20 focus:outline-none font-mono text-sm"
            />
            <AnimatePresence mode="wait">
              {status === 'success' ? (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-primary font-mono text-xs"
                >
                  [GRANTED]
                </motion.span>
              ) : status === 'loading' ? (
                <span className="text-primary/70 font-mono text-xs animate-pulse">
                  [PROCESSING...]
                </span>
              ) : (
                <button
                  type="submit"
                  disabled={!email}
                  className="text-primary hover:text-white font-mono text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  [EXECUTE]
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-3 border border-primary/30 bg-primary/5 font-mono text-xs text-primary rounded-lg"
        >
          &gt; ACCESS_PENDING: You will receive deployment credentials shortly.
        </motion.div>
      )}
    </form>
  )
}

// ═══════════════════════════════════════════════════════════════════
// MAIN LANDING PAGE
// ═══════════════════════════════════════════════════════════════════
export function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, -100])
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0])

  return (
    <TurbulentBackground
      zoom={0.05}
      rotation={3.5}
      speed={0.3}
      morphSpeed={0.15}
      saturation={0.2}
      brightness={1.1}
      contrast={1.4}
      hue={0.9}
    >
      <div
        ref={containerRef}
        className="relative w-full min-h-screen text-white selection:bg-primary/30 overflow-x-hidden"
      >
        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-8 h-8 border border-primary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Skull className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-[0.2em] leading-none font-syne">
                    KURTVITZA
                  </span>
                  <span className="text-[9px] font-mono text-white/30 tracking-wider">
                    SYSTEM.v4.2.0
                  </span>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-2">
                <MotionHighlight
                  items={['SYSTEMS', 'DOCS', 'CHANGELOG']}
                  onSelect={item => {
                    if (item === 'DOCS') {
                      window.location.href = '/docs'
                      return
                    }
                    const el = document.getElementById(item.toLowerCase())
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                />
              </div>

              <div className="flex items-center gap-4">
                <Link
                  href={isLoggedIn ? '/app' : '/login'}
                  className="group relative inline-flex items-center gap-2 px-6 py-2 text-sm font-bold bg-white text-black hover:bg-white/90 transition-all duration-300 rounded-full overflow-hidden"
                >
                  <GlowEffect
                    colors={['#4f46e5', '#8b5cf6']}
                    mode="static"
                    blur="soft"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  />
                  <span className="relative z-10">{isLoggedIn ? 'Dashboard' : 'Get Started'}</span>
                  <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <motion.section
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative min-h-[90vh] flex flex-col items-center justify-center px-6 pt-24"
        >
          <div className="text-center max-w-5xl mx-auto mb-16">
            <div className="min-h-[200px] md:min-h-[320px] flex items-center justify-center mb-8">
              <HeadlineVariant />
            </div>

            <div className="text-sm md:text-xl text-white/50 max-w-3xl mx-auto leading-relaxed min-h-[4rem] md:h-16">
              <AggressiveGlitchText
                text="AI-powered tools to build games faster. Or better. Or both. Pick what you need, skip what you don't."
                className="font-mono tracking-tight"
              />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-6"
          >
            <Link
              href={isLoggedIn ? '/app' : '/login'}
              className="group relative inline-flex items-center gap-3 px-10 py-5 text-base font-black bg-white text-black hover:bg-white/95 transition-all duration-500 rounded-xl shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] font-syne"
            >
              <Plus className="w-5 h-5" />
              START BUILDING FREE
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button className="group inline-flex items-center gap-3 px-8 py-5 text-sm font-bold text-white/60 hover:text-white transition-all border border-white/10 hover:border-white/30 rounded-xl bg-black/40 backdrop-blur-xl font-syne">
              <Play className="w-4 h-4" />
              WATCH DEMO
            </button>
          </motion.div>
        </motion.section>

        {/* Bento Grid Section */}
        <section id="systems" className="py-32 px-6 relative">
          <div className="max-w-7xl mx-auto mb-20 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex items-center justify-center lg:justify-start gap-4 mb-8"
            >
              <div className="w-8 h-px bg-primary" />
              <span className="text-xs font-mono text-primary uppercase tracking-widest">
                INFRASTRUCTURE_MODULES
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter font-mono"
            >
              <span className="text-white">AI</span>
              <span className="text-primary"> ARSENAL</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-sm md:text-base font-mono text-white/40 mt-4 tracking-widest"
            >
              AI TOOLS • BUILD FASTER • SHIP BETTER
            </motion.p>
          </div>

          {/* FEATURE SUMMARY BAR */}
          <div className="max-w-7xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-wrap items-center justify-between gap-6 px-8 py-5 bg-white/[0.02] border border-white/5 rounded-xl backdrop-blur-sm"
            >
              {[
                { label: 'WORLD_GEN', val: '∞ PROXIMAL', icon: Map },
                { label: 'AI_NARRATIVE', val: 'EMERGENT', icon: Brain },
                { label: 'SCULPT_SIM', val: 'BATTLE_TESTED', icon: Palette },
                { label: 'EXPORT_SEC', val: 'PROD_READY', icon: Boxes },
              ].map((stat, i) => {
                const Icon = stat.icon
                return (
                  <div key={i} className="group/stat flex items-center gap-4">
                    {/* 3D Icon Container */}
                    <div className="relative">
                      {/* Glow */}
                      <div className="absolute inset-0 bg-primary rounded-xl blur-xl opacity-30 group-hover/stat:opacity-50 transition-opacity duration-500" />
                      {/* 3D Box */}
                      <div 
                        className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center transition-all duration-300 group-hover/stat:scale-110 group-hover/stat:-translate-y-1"
                        style={{
                          boxShadow: '0 10px 30px -10px rgba(147, 51, 234, 0.6), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.2)',
                        }}
                      >
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-mono text-white/40 tracking-widest uppercase">
                        {stat.label}
                      </span>
                      <span className="text-sm font-bold font-mono tracking-tight text-white">
                        {stat.val}
                      </span>
                    </div>
                    {i < 3 && <div className="hidden lg:block w-px h-10 bg-white/10 ml-2" />}
                  </div>
                )
              })}
              <div className="hidden xl:flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span className="text-[10px] font-mono text-primary font-bold uppercase tracking-widest leading-none">
                  SYSTEM_READY.v4
                </span>
              </div>
            </motion.div>
          </div>

          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Row 1 & 2 Big Tile */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 lg:row-span-2 rounded-xl border border-white/5 bg-black/40 backdrop-blur-xl overflow-hidden group"
              >
                <div className="aspect-video lg:aspect-auto lg:h-[500px] relative bg-black/40 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <div className="absolute inset-0 flex items-center justify-center border-b border-white/5">
                    <Map className="w-32 h-32 text-primary/20 group-hover:scale-110 transition-transform duration-700" />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-primary/20 overflow-hidden">
                    <motion.div
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                      className="w-1/3 h-full bg-primary"
                    />
                  </div>
                </div>
                <div className="p-10">
                  <div className="flex items-center justify-between mb-6">
                    <div className="px-3 py-1 border border-primary/30 rounded-full bg-primary/10 text-[10px] font-mono text-primary">
                      WLD_GEN_v4
                    </div>
                    <span className="text-[10px] font-mono text-white/20">CORE::SYSTEM</span>
                  </div>
                  <h3 className="text-4xl font-black tracking-wide text-white mb-6 font-syne">
                    Infinite Procedural Worlds
                  </h3>
                  <p className="text-white/50 font-mono text-base leading-relaxed">
                    Battle-tested terrain generation algorithms. Scale from a single dungeon to a
                    continental megastructure in milliseconds.
                  </p>
                </div>
              </motion.div>

              {/* Interactive Tile */}
              <div className="lg:col-span-2">
                <ConceptToCarnageTile />
              </div>

              {/* Stress Tested Scenes */}
              <div className="lg:col-span-1">
                <BrutalCard feature={FEATURES[5]} index={5} />
              </div>

              {/* Secure Assets */}
              <div className="lg:col-span-1">
                <BrutalCard feature={FEATURES[6]} index={6} />
              </div>

              {/* AI Narratives */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                className="lg:col-span-2 rounded-xl border border-white/5 bg-black/40 backdrop-blur-xl p-10 group"
              >
                <div className="flex items-center gap-4 mb-8">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                    <Brain className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="text-3xl font-black tracking-wide text-white font-syne">
                    Emergent AI Narratives
                  </h3>
                </div>
                <p className="text-white/40 font-mono text-base leading-relaxed mb-8">
                  The AI dungeon master that doesn&apos;t pull punches. Faction warfare, political
                  intrigue, and cold-blooded betrayal.
                </p>
                <div className="h-32 rounded-xl bg-black/60 border border-white/5 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,197,94,0.1),transparent)] group-hover:scale-150 transition-transform duration-1000" />
                  <span className="text-[10px] font-mono text-white/30 tracking-[0.3em] uppercase">
                    SYMLINK::NEURAL_DRIVE
                  </span>
                </div>
              </motion.div>

              {/* Terrain Sculpting */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  className="h-full rounded-xl border border-white/5 bg-black/40 backdrop-blur-xl p-10 group flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center gap-4 mb-8">
                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <Palette className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="text-3xl font-black tracking-wide text-white font-syne">
                        Brutal Sculpting
                      </h3>
                    </div>
                    <p className="text-white/40 font-mono text-base leading-relaxed">
                      Carve mountains. Dig trenches. Shape the battlefield. Every scar on the land
                      tells a story of survival.
                    </p>
                  </div>
                  <div className="mt-8 flex items-center justify-between">
                    <div className="flex -space-x-3">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="w-8 h-8 rounded-full border-2 border-black bg-primary/20"
                        />
                      ))}
                    </div>
                    <span className="text-[10px] font-mono text-primary/50 uppercase tracking-widest">
                      ACTIVE_SCULPTORS_04
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Final Rows */}
              <div className="lg:col-span-1">
                <BrutalCard feature={FEATURES[3]} index={3} />
              </div>
              <div className="lg:col-span-3">
                <BrutalCard feature={FEATURES[4]} index={4} />
              </div>
            </div>
          </div>
        </section>

        {/* Architecting Reality (Step by Step) */}
        <section className="py-32 px-6 relative">
          <div className="max-w-7xl mx-auto mb-20 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex items-center justify-center lg:justify-start gap-4 mb-8"
            >
              <div className="w-8 h-px bg-primary" />
              <span className="text-xs font-mono text-primary uppercase tracking-widest">
                CORE_WORKFLOW
              </span>
            </motion.div>

            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter font-mono"
            >
              <span className="text-white">ARCHITECTING</span>
              <span className="text-white/20"> REALITY</span>
            </motion.h2>
          </div>

          <div className="max-w-7xl mx-auto relative">
            {/* INFRASTRUCTURE WIRING */}
            <svg
              className="absolute inset-0 w-full h-full -z-10 opacity-20 pointer-events-none hidden lg:block"
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
            >
              <motion.path
                d="M 125 50 L 375 50 M 375 50 L 625 50 M 625 50 L 875 50"
                fill="none"
                stroke="url(#wireGradient)"
                strokeWidth="2"
                strokeDasharray="10 10"
                initial={{ strokeDashoffset: 0 }}
                animate={{ strokeDashoffset: -100 }}
                transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
              />
              <defs>
                <linearGradient id="wireGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#5c7cfa" stopOpacity="0" />
                  <stop offset="50%" stopColor="#5c7cfa" stopOpacity="1" />
                  <stop offset="100%" stopColor="#5c7cfa" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* SECTION SCANNER */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 opacity-30">
              <ScannerLine />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {STEPS.map((step, i) => (
                <SystemModuleCard key={i} step={step} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-32 px-6 relative border-t border-white/5 bg-white/[0.01]">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 font-syne uppercase tracking-tighter">
                Loved by creators worldwide
              </h2>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px w-12 bg-white/10" />
                <p className="text-white/40 font-mono">JOIN THE ARCHITECTS</p>
                <div className="h-px w-12 bg-white/10" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  quote:
                    'This changed how I approach world-building. The AI generation is mind-blowing.',
                  author: 'Alex Chen',
                  role: 'Indie Game Dev',
                  icon: <Skull className="w-5 h-5 text-primary" />,
                },
                {
                  quote:
                    'Finally, a tool that understands procedural generation the way I need it.',
                  author: 'Sarah Miller',
                  role: 'Tech Artist',
                  icon: <Boxes className="w-5 h-5 text-primary" />,
                },
                {
                  quote: 'The narrative AI is like having a co-writer who never sleeps.',
                  author: 'Marcus Wright',
                  role: 'Game Writer',
                  icon: <Brain className="w-5 h-5 text-primary" />,
                },
              ].map((t, i) => (
                <motion.div
                  key={i}
                  whileHover={{ y: -10 }}
                  className="p-8 rounded-xl bg-black/40 border border-white/5 backdrop-blur-xl relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                    {t.icon}
                  </div>
                  <p className="text-lg text-white/70 mb-8 italic font-serif leading-relaxed">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center font-bold text-primary">
                      {t.author[0]}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{t.author}</div>
                      <div className="text-xs text-white/30 font-mono uppercase tracking-widest">
                        {t.role}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Manifesto */}
        <section className="py-40 px-6 relative overflow-hidden">
          {/* Background effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(147,51,234,0.15),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(220,38,38,0.08),transparent_50%)]" />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
          
          <div className="max-w-6xl mx-auto relative z-10">
            {/* Giant statement */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="mb-24"
            >
              <div className="text-center mb-8">
                <span className="inline-block px-4 py-2 border border-primary/30 rounded-full text-[10px] font-mono text-primary tracking-[0.3em] uppercase bg-primary/5">
                  MANIFESTO
                </span>
              </div>
              
              <h2 className="text-5xl md:text-7xl lg:text-8xl font-black text-center leading-[0.9] font-syne">
                <span className="block text-white/20">WE DON&apos;T</span>
                <span className="block text-white">REPLACE</span>
                <span className="block bg-gradient-to-r from-primary via-purple-400 to-primary bg-clip-text text-transparent">
                  CREATORS
                </span>
              </h2>
              
              <motion.div
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="h-1 bg-gradient-to-r from-transparent via-primary to-transparent max-w-md mx-auto mt-12"
              />
            </motion.div>

            {/* Two column layout */}
            <div className="grid md:grid-cols-2 gap-16 mb-24">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center">
                    <X className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-black font-syne text-white">NOT THIS</span>
                </div>
                <p className="text-lg text-white/50 font-mono leading-relaxed">
                  &ldquo;AI will replace artists&rdquo;
                </p>
                <p className="text-lg text-white/50 font-mono leading-relaxed">
                  &ldquo;Creativity is dead&rdquo;
                </p>
                <p className="text-lg text-white/50 font-mono leading-relaxed">
                  &ldquo;Humans are obsolete&rdquo;
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="space-y-6"
              >
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                    <Check className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-2xl font-black font-syne text-white">BUT THIS</span>
                </div>
                <p className="text-lg text-white/80 font-mono leading-relaxed">
                  AI handles the <span className="text-primary font-bold">tedious grunt work</span>
                </p>
                <p className="text-lg text-white/80 font-mono leading-relaxed">
                  Humans focus on <span className="text-primary font-bold">creative vision</span>
                </p>
                <p className="text-lg text-white/80 font-mono leading-relaxed">
                  Together: <span className="text-primary font-bold">10x the output</span>
                </p>
              </motion.div>
            </div>

            {/* Core belief */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center p-12 rounded-xl border border-white/10 bg-white/[0.02] backdrop-blur-sm"
            >
              <p className="text-2xl md:text-3xl font-black font-syne text-white leading-snug max-w-3xl mx-auto">
                Your taste. Your vision. Your instinct.
                <br />
                <span className="text-primary">That&apos;s the magic we can&apos;t automate.</span>
              </p>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-20 grid grid-cols-3 gap-8"
            >
              {[
                { value: '100%', label: 'HUMAN CREATIVITY', sub: 'irreplaceable' },
                { value: '0%', label: 'TEDIOUS WORK', sub: 'automated' },
                { value: '∞', label: 'POSSIBILITIES', sub: 'unlocked' },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 * i }}
                  className="text-center"
                >
                  <div className="text-5xl md:text-6xl font-black text-primary font-mono mb-2">{stat.value}</div>
                  <div className="text-xs font-mono text-white/60 tracking-[0.2em] uppercase">{stat.label}</div>
                  <div className="text-[10px] font-mono text-white/30 mt-1">{stat.sub}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* CTA Footer */}
        <footer className="py-40 px-6 relative border-t border-white/5 bg-black overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,rgba(92,124,250,0.15),transparent_70%)]" />
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <h2 className="text-5xl md:text-7xl font-black mb-12 uppercase tracking-tighter font-syne">
              Ready to build?
            </h2>
            <div className="flex justify-center mb-16">
              <TerminalInput />
            </div>
            <div className="flex flex-wrap justify-center gap-10 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
              {['UNITY', 'UNREAL', 'GODOT', 'GLTF', 'FBX'].map(tech => (
                <span key={tech} className="text-xl font-black tracking-widest font-mono">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </TurbulentBackground>
  )
}
