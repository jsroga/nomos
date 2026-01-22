'use client'

import { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
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
  Users,
  Sparkles,
} from 'lucide-react'
import { TurbulentBackground } from './TurbulentBackground'
import { MotionHighlight, LiquidDistortionText } from '@/components/ui/text-effects'
import { BleedingText } from './BleedingText'
import { ThreeDIcon } from './ThreeDIcon'
import { ToolsIntegration } from './ToolsIntegration'
import { ProPlanPromo } from './ProPlanPromo'

// ═══════════════════════════════════════════════════════════════════
// FEATURES DATA
// ═══════════════════════════════════════════════════════════════════
const FEATURES = [
  {
    icon: Map,
    title: 'World Generation',
    description: 'Infinite procedural terrain. Days → minutes. Ship-ready assets.',
    accent: '#5c7cfa',
    code: 'WLD_GEN',
    img: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Brain,
    title: 'AI Storyteller',
    description: 'Quests, factions, arcs. AI co-writer. Always on.',
    accent: '#5c7cfa',
    code: 'NAR_SYS',
    img: 'https://images.unsplash.com/photo-1516414447565-b14be0adf13e?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Palette,
    title: 'Terrain Sculpting',
    description: 'Mountains, rivers, dungeons. AI-assisted. Rapid iteration.',
    accent: '#5c7cfa',
    code: 'TER_SCL',
    img: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Boxes,
    title: 'One-Click Export',
    description: 'Unity. Unreal. GLTF. Zero friction. Ship instantly.',
    accent: '#5c7cfa',
    code: 'EXP_SYS',
    img: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Zap,
    title: 'Loop Designer',
    description: 'Data-driven mechanics. Addictive loops. Validated patterns.',
    accent: '#5c7cfa',
    code: 'LOP_DES',
    img: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Flame,
    title: 'Scene Simulator',
    description: 'Combat. Physics. Chaos. Test before you code.',
    accent: '#5c7cfa',
    code: 'STR_TST',
    img: 'https://images.unsplash.com/photo-1614729375519-c61f9e511c6e?auto=format&fit=crop&w=600&q=80',
  },
  {
    icon: Shield,
    title: 'Team Collab',
    description: 'Secure storage. Role access. Any team size.',
    accent: '#5c7cfa',
    code: 'SEC_AST',
    img: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80',
  },
]

const STEPS = [
  {
    title: 'Generate',
    subtitle: 'PROCEDURAL_ENGINE',
    description:
      'Terrain generation from 3 weeks to 2 days. Infinite worlds, dungeons, environments.',
    type3d: 'GENERATOR',
    stat: '10x',
    statLabel: 'faster iteration',
  },
  {
    title: 'Evolve',
    subtitle: 'NEURAL_NARRATIVE',
    description:
      'Procedural tools that think like an artist, not an engineer. AI handles the filler.',
    type3d: 'NEURAL',
    stat: '40+',
    statLabel: 'hours saved/week',
  },
  {
    title: 'Ship',
    subtitle: 'EXPORT_PIPELINE',
    description: 'You write the quests that matter. One-click export to Unity, Unreal, Godot.',
    type3d: 'EXPORTER',
    stat: '300%',
    statLabel: 'more content',
  },
]

// ═══════════════════════════════════════════════════════════════════
// HERO HEADLINE - 3-line AI-POWERED WORLD BUILDING
// ═══════════════════════════════════════════════════════════════════
const HeadlineVariant = () => {
  return (
    <h1 className="flex flex-col items-center gap-1 font-black uppercase tracking-[-0.02em] font-syne text-white text-center leading-[0.85]">
      <LiquidDistortionText text="BUILD" className="text-[clamp(2.4rem,8vw,6.4rem)]" />
      <LiquidDistortionText text="WORLDS" className="text-[clamp(3rem,10vw,8rem)]" />
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
      className="group relative h-full min-h-[280px] border border-white/10 cursor-pointer overflow-hidden rounded-xl bg-black/40 backdrop-blur-sm transition-all duration-500 hover:border-primary/50"
    >
      {/* Subtle grid in background for clean look */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        }}
      />

      {/* Screenshot Frame */}
      <div className="absolute inset-4 bottom-24 flex items-center justify-center overflow-hidden rounded-lg border border-white/5 bg-black/20">
        <AnimatePresence mode="wait">
          <motion.img
            key={state}
            src={
              state === 'concept'
                ? '/projects/01c5deda-c654-4576-89f9-860ff545f2dd/assets/asset_1764677757871.png'
                : '/projects/01c5deda-c654-4576-89f9-860ff545f2dd/0_0_1764510993677_upscaled_gemini_upscaled_gemini_upscaled_4k.png'
            }
            alt={state === 'concept' ? 'Concept sketch' : 'Final game'}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Glow behind screenshot */}
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      </div>

      {/* Content footer */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/80 to-transparent">
        <span className="font-mono text-[10px] text-primary mb-2 tracking-widest uppercase">
          CLICK TO TRANSFORM
        </span>
        <h3 className="text-2xl font-black tracking-wide leading-tight mb-2 font-syne">
          From Concept
          <br />
          <span className={state === 'carnage' ? 'text-primary' : 'text-white'}>To Carnage</span>
        </h3>
        <div className="flex items-center gap-2 text-xs font-mono text-white/50">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          {state === 'concept' ? 'Sketch phase' : 'Production ready'}
        </div>
      </div>
    </motion.div>
  )
}

// ═══════════════════════════════════════════════════════════════════
// BRUTAL FEATURE CARD
// ═══════════════════════════════════════════════════════════════════
const BrutalCard = ({
  feature,
  index,
  className,
}: {
  feature: (typeof FEATURES)[0]
  index: number
  className?: string
}) => {
  const Icon = feature.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -50 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      viewport={{ once: true, margin: '-50px' }}
      className={`group relative h-full min-h-[280px] ${className || ''}`}
    >
      <div
        className={`relative h-full border border-white/10 rounded-xl overflow-hidden backdrop-blur-sm group-hover:bg-white/[0.04] transition-colors duration-500 ${className ? '' : 'bg-white/[0.02]'}`}
      >
        {/* Subtle grid pattern for clean background */}
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(${feature.accent || '#5c7cfa'} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
        />

        {/* Large faint icon in background */}
        <div className="absolute -right-4 -bottom-4 opacity-[0.05] group-hover:opacity-[0.08] transition-opacity duration-500">
          <Icon size={160} strokeWidth={1} />
        </div>

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end p-6">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-5 h-5 text-primary" />
            <span className="font-mono text-[10px] text-primary/80 tracking-wider">
              {feature.code}
            </span>
          </div>
          <h3 className="text-xl font-black tracking-wide text-white mb-2 font-syne">
            {feature.title}
          </h3>
          <p className="text-white/70 leading-relaxed text-sm font-mono">{feature.description}</p>
        </div>
      </div>
    </motion.div>
  )
}

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
// FEATURE DEEP DIVE ROW
// ═══════════════════════════════════════════════════════════════════
const FeatureDeepDive = ({
  title,
  subtitle,
  description,
  type3d,
  align = 'left',
  index,
  color = '#5c7cfa',
  pngIcon,
  screenshotPlaceholder = true,
  modelScale = 0.5,
  modelOffsetX = 0,
  modelOffsetY = 0,
}: {
  title: string
  subtitle: string
  description: string
  type3d: string
  align?: 'left' | 'right'
  index: number
  color?: string
  pngIcon?: string
  screenshotPlaceholder?: boolean
  modelScale?: number
  modelOffsetX?: number
  modelOffsetY?: number
}) => {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const layoutId = `screenshot-${index}`

  return (
    <section className="py-24 relative">
      <div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/5 hidden lg:block" />

      <div
        className={`flex flex-col lg:flex-row gap-12 lg:gap-24 items-center ${align === 'right' ? 'lg:flex-row-reverse' : ''}`}
      >
        {/* Visual Side - Screenshot Primary, 3D Icon as Background */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1 w-full relative"
        >
          <div className="relative aspect-square lg:aspect-[4/3] rounded-lg overflow-hidden bg-[#050505] border border-white/10 group">
            {/* Layer 1: 3D Icon as decorative background (full opacity) */}
            <div className="absolute inset-0 pointer-events-none">
              <ThreeDIcon
                type={type3d}
                color={color}
                scale={modelScale}
                offset={[modelOffsetX, modelOffsetY]}
              />
            </div>

            {/* Layer 2: Screenshot Placeholder (PRIMARY) - Clickable for lightbox */}
            <div className="absolute inset-0 flex items-center justify-center p-6 z-10">
              <motion.div
                layoutId={layoutId}
                onClick={() => setIsLightboxOpen(true)}
                className="w-[85%] aspect-video rounded-lg border-2 border-white/20 bg-black/80 backdrop-blur-md flex items-center justify-center cursor-pointer group-hover:border-white/40 hover:scale-[1.02] transition-all duration-300"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg border border-white/20 bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                    <Play className="w-5 h-5 text-white/60" />
                  </div>
                  <span className="text-white/50 font-mono text-xs tracking-widest">
                    CLICK TO PREVIEW
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Layer 3: UI overlay details */}
            <div className="absolute top-4 left-4 flex gap-2 z-20">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              />
              <div className="text-[10px] font-mono text-white/40 tracking-widest">{subtitle}</div>
            </div>

            {/* Corner marks */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/20 z-20" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/20 z-20" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/20 z-20" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/20 z-20" />
          </div>
        </motion.div>

        {/* Lightbox Modal with Flip Animation */}
        <AnimatePresence>
          {isLightboxOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl"
              onClick={() => setIsLightboxOpen(false)}
            >
              <motion.div
                layoutId={layoutId}
                className="relative w-[90vw] max-w-5xl aspect-video rounded-xl border-2 border-white/20 bg-black/90 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                {/* Expanded screenshot content */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center">
                      <Play className="w-10 h-10 text-white/60" />
                    </div>
                    <h4 className="text-2xl font-syne font-bold text-white mb-2">{title}</h4>
                    <span className="text-white/40 font-mono text-sm tracking-widest">
                      [SCREENSHOT PREVIEW]
                    </span>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                {/* Corner marks */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/30" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/30" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/30" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/30" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Side with Screenshot Placeholder */}
        <motion.div
          initial={{ opacity: 0, x: align === 'left' ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 text-center lg:text-left"
        >
          <div
            className={`flex items-center gap-4 mb-6 ${align === 'right' ? 'lg:flex-row-reverse' : ''} justify-center lg:justify-start`}
          >
            <span className="text-4xl font-mono text-white/10 font-black">0{index}</span>
            <div className="h-px w-12 bg-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest">
              {subtitle}
            </span>
          </div>

          <h3 className="text-4xl md:text-5xl font-black text-white font-syne mb-6 leading-[0.9] uppercase">
            {title.split(' ').map((word, i) => (
              <span key={i} className="block">
                {word}
              </span>
            ))}
          </h3>

          <p className="text-lg text-white/60 font-mono leading-relaxed max-w-md mx-auto lg:mx-0 mb-8">
            {description}
          </p>

          {/* Screenshot Placeholder Frame */}
          {screenshotPlaceholder && (
            <div className="relative aspect-video max-w-md mx-auto lg:mx-0 rounded-lg overflow-hidden border border-white/10 bg-black/50 group/screenshot hover:border-primary/30 transition-colors">
              {/* Corner marks */}
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/30" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/30" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/30" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/30" />

              {/* Preview label */}
              <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-white/30 uppercase tracking-widest">
                Preview
              </div>

              {/* Placeholder content */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 border border-dashed border-white/20 rounded-lg flex items-center justify-center">
                    <Play className="w-5 h-5 text-white/20" />
                  </div>
                  <span className="text-xs font-mono text-white/20 tracking-wider">
                    [SCREENSHOT: {title}]
                  </span>
                </div>
              </div>

              {/* Hover glow */}
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/screenshot:opacity-100 transition-opacity duration-500" />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}

export function LandingPage({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30 })
  const heroY = useTransform(smoothProgress, [0, 0.2], [0, -100])
  const heroOpacity = useTransform(smoothProgress, [0, 0.15], [1, 0])
  // Background darkening overlay - fades to 50% black as user scrolls
  const bgOverlayOpacity = useTransform(smoothProgress, [0, 0.3], [0, 0.5])

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
        {/* Background darkening overlay - behind content */}
        <motion.div
          style={{ opacity: bgOverlayOpacity }}
          className="fixed inset-0 bg-black pointer-events-none z-0"
        />

        {/* Navigation */}
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-6">
            <div className="flex h-16 items-center justify-between">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-12 h-12 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <img
                    src="/logo.png"
                    alt="KUR"
                    className="w-full h-full object-contain brightness-0 invert"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-black uppercase tracking-[0.2em] leading-none font-syne">
                    KUR
                  </span>
                  <span className="text-[9px] font-mono text-white/30 tracking-wider">
                    SYSTEM.v1.0.0
                  </span>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-2">
                <MotionHighlight
                  items={['SYSTEMS', 'DOCS', 'API', 'CHANGELOG']}
                  onSelect={item => {
                    if (item === 'DOCS') {
                      window.location.href = '/docs/getting-started'
                      return
                    }
                    if (item === 'API') {
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
                  className="group relative inline-flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white transition-all duration-300 rounded-lg overflow-hidden border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 backdrop-blur-sm hover:shadow-[0_0_20px_-5px_rgba(92,124,250,0.5)] hover:scale-[1.02]"
                >
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
          className="relative min-h-[85vh] flex flex-col items-center justify-center px-6 pt-20 pb-8"
        >
          <div className="text-center max-w-5xl mx-auto mb-12">
            <div className="min-h-[160px] md:min-h-[240px] flex items-center justify-center mb-6">
              <HeadlineVariant />
            </div>

            <div className="flex flex-col gap-1 text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-snug font-mono tracking-tight">
              <span>AI-powered game dev toolkit.</span>
              <span>10x faster iteration.</span>
              <span className="text-primary">Ship games, not busywork.</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="flex flex-col sm:flex-row items-center gap-5"
          >
            <Link
              href={isLoggedIn ? '/app' : '/login'}
              className="group relative inline-flex items-center gap-3 px-10 py-5 text-sm font-bold text-white transition-all duration-300 rounded-lg overflow-hidden border border-primary/60 hover:border-primary bg-primary/20 hover:bg-primary/30 backdrop-blur-sm shadow-[0_0_30px_-10px_rgba(92,124,250,0.4)] hover:shadow-[0_0_40px_-8px_rgba(92,124,250,0.6)] hover:scale-[1.03] font-syne tracking-wide"
            >
              <Plus className="w-4 h-4" />
              START BUILDING FREE
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button className="group relative inline-flex items-center gap-3 px-8 py-4 text-sm font-bold text-white transition-all duration-300 rounded-lg overflow-hidden border border-primary/50 hover:border-primary bg-primary/10 hover:bg-primary/20 backdrop-blur-sm hover:shadow-[0_0_20px_-5px_rgba(92,124,250,0.5)] hover:scale-[1.02] font-syne tracking-wide">
              <Play className="relative z-10 w-4 h-4" />
              <span className="relative z-10">WATCH DEMO</span>
            </button>
          </motion.div>
        </motion.section>

        {/* Tools Integration - "Keep Your Tools. Add More Power." */}
        <ToolsIntegration />

        {/* Bento Grid Section */}
        <section id="systems" className="py-32 px-6 relative">
          {/* Vertical Thread Line - Connecting the entire section */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 hidden lg:block -translate-x-1/2" />

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

          <div className="max-w-7xl mx-auto">
            {/* TRUE BENTO GRID - Asymmetric with varied heights */}
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-32 auto-rows-[140px]">
              {/* Interactive Tile - Concept to Carnage (3x2) - Large feature */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="md:col-span-3 lg:col-span-3 row-span-2"
              >
                <ConceptToCarnageTile />
              </motion.div>

              {/* Scene Simulator (2x1) */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="md:col-span-2 lg:col-span-2 row-span-1 rounded-lg border border-white/10 overflow-hidden group relative bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl"
              >
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
                    backgroundSize: '12px 12px',
                  }}
                />
                <div className="absolute top-0 right-0 w-24 h-24 opacity-30">
                  <ThreeDIcon type="STR_TST" />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-[9px] text-cyan-400/80 tracking-widest uppercase">
                      Scene_Sim
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-white font-syne">Scene Simulator</h3>
                </div>
              </motion.div>

              {/* Team Collab (1x1) - Small square */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="md:col-span-1 lg:col-span-1 row-span-1 rounded-lg border border-white/10 overflow-hidden group relative bg-gradient-to-br from-violet-950/30 to-black/40 backdrop-blur-xl"
              >
                <div className="absolute inset-0 flex items-center justify-center opacity-20 group-hover:opacity-40 transition-opacity">
                  <Users size={48} strokeWidth={1} />
                </div>
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <span className="font-mono text-[8px] text-violet-400/80 tracking-widest uppercase mb-1">
                    Team
                  </span>
                  <h3 className="text-sm font-black text-white font-syne">Collab</h3>
                </div>
              </motion.div>

              {/* Loop Designer (3x1) - Wide banner */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="md:col-span-3 lg:col-span-3 row-span-1 rounded-lg border border-white/10 overflow-hidden group relative bg-gradient-to-r from-green-950/30 via-black/40 to-black/60 backdrop-blur-xl"
              >
                <div
                  className="absolute inset-0 opacity-[0.03]"
                  style={{
                    backgroundImage: 'radial-gradient(#22c55e 1px, transparent 1px)',
                    backgroundSize: '14px 14px',
                  }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 w-20 h-20 opacity-40">
                  <ThreeDIcon type="LOP_DES" />
                </div>
                <div className="absolute inset-0 flex items-center p-5">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Zap className="w-4 h-4 text-green-400" />
                      <span className="font-mono text-[9px] text-green-400/80 tracking-widest uppercase">
                        Loop_Designer
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white font-syne">
                      Addictive Game Loops
                    </h3>
                    <p className="text-white/50 font-mono text-xs mt-1 max-w-xs">
                      "Just one more turn" — engineered, not guessed.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* VERTICAL DEEP DIVES - 5 MODULE SECTIONS */}
            <div className="space-y-12">
              {/* Section 1: AI Storyteller */}
              <FeatureDeepDive
                index={1}
                title="AI Storyteller"
                subtitle="NARRATIVE_ENGINE"
                description="Factions. Intrigue. Betrayal. An AI co-writer that understands narrative arcs and character motivation, never sleeping, always plotting."
                type3d="AI_NARRATIVE"
                modelScale={5}
                modelOffsetX={-0.5}
                modelOffsetY={-0.2}
                align="left"
                pngIcon="/images/icons/ai-narrative.png"
              />

              {/* Section 2: Infinite Procedural Worlds */}
              <FeatureDeepDive
                index={2}
                title="Infinite Worlds"
                subtitle="PROCEDURAL_ENGINE"
                description="Generate entire continents in milliseconds. Biomes, caves, cities—all procedurally crafted. The foundation of your reality, infinitely scalable."
                type3d="WORLD_GEN"
                align="right"
                modelScale={5}
                modelOffsetX={-0.5}
                modelOffsetY={-0.2}
                pngIcon="/images/icons/world-gen.png"
              />

              {/* Section 3: 3D Canvas / Terrain Sculpting */}
              <FeatureDeepDive
                index={3}
                title="3D Canvas"
                subtitle="SCULPT_SIMULATION"
                description="Shape mountains and gouge trenches with real-time physics simulation. Drag, drop, sculpt. The most tactile terrain tool ever built."
                type3d="SCULPT_SIM"
                align="left"
                pngIcon="/images/icons/sculpt-sim.png"
              />

              {/* Section 4: One-Click Export */}
              <FeatureDeepDive
                index={4}
                title="One-Click Export"
                subtitle="EXPORT_PIPELINE"
                description="Unity. Unreal. Godot. GLTF. Zero friction pipeline from concept to production. Ship your worlds to any engine with a single click."
                type3d="EXPORT_SEC"
                modelOffsetY={-0.3}
                modelOffsetX={-0.5}
                align="right"
                pngIcon="/images/icons/export-sec.png"
              />

              {/* Section 5: API & MCP Integration */}
              <section className="py-24 relative">
                <div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/5 hidden lg:block" />

                <div className="flex flex-col lg:flex-row gap-12 lg:gap-24 items-center">
                  {/* Code Example Side */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{ duration: 0.7 }}
                    className="flex-1 w-full"
                  >
                    <div className="relative rounded-lg overflow-hidden bg-[#0d0d0d] border border-white/10">
                      {/* Terminal Header */}
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                        <div className="flex gap-1.5">
                          <div className="w-3 h-3 rounded-full bg-red-500/80" />
                          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                          <div className="w-3 h-3 rounded-full bg-green-500/80" />
                        </div>
                        <span className="text-[10px] font-mono text-white/30 ml-2">
                          api_example.ts
                        </span>
                      </div>

                      {/* Code Content */}
                      <div className="p-6 font-mono text-sm leading-relaxed overflow-x-auto">
                        <div className="text-white/40">// REST API</div>
                        <div>
                          <span className="text-purple-400">const</span>{' '}
                          <span className="text-blue-300">world</span> ={' '}
                          <span className="text-purple-400">await</span>{' '}
                          <span className="text-yellow-300">fetch</span>(
                          <span className="text-green-300">'/api/worlds/generate'</span>, {'{'}
                        </div>
                        <div className="pl-4">
                          <span className="text-blue-300">method</span>:{' '}
                          <span className="text-green-300">'POST'</span>,
                        </div>
                        <div className="pl-4">
                          <span className="text-blue-300">body</span>: JSON.stringify({'{'}{' '}
                          <span className="text-blue-300">biome</span>:{' '}
                          <span className="text-green-300">'forest'</span>,{' '}
                          <span className="text-blue-300">size</span>:{' '}
                          <span className="text-orange-300">1024</span> {'}'})
                        </div>
                        <div>{'}'});</div>
                        <div className="mt-4 text-white/40">// MCP Protocol</div>
                        <div>
                          <span className="text-purple-400">import</span> {'{'}{' '}
                          <span className="text-blue-300">MCPClient</span> {'}'}{' '}
                          <span className="text-purple-400">from</span>{' '}
                          <span className="text-green-300">'@kurtvitza/mcp'</span>;
                        </div>
                        <div className="mt-2">
                          <span className="text-purple-400">const</span>{' '}
                          <span className="text-blue-300">mcp</span> ={' '}
                          <span className="text-purple-400">new</span>{' '}
                          <span className="text-yellow-300">MCPClient</span>();
                        </div>
                        <div>
                          <span className="text-purple-400">await</span> mcp.
                          <span className="text-yellow-300">connect</span>(
                          <span className="text-green-300">'kurtvitza://studio'</span>);
                        </div>
                        <div>
                          mcp.<span className="text-yellow-300">on</span>(
                          <span className="text-green-300">'terrain:update'</span>,{' '}
                          <span className="text-blue-300">handleUpdate</span>);
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Content Side */}
                  <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="flex-1 text-center lg:text-left"
                  >
                    <div className="flex items-center gap-4 mb-6 justify-center lg:justify-start">
                      <span className="text-4xl font-mono text-white/10 font-black">05</span>
                      <div className="h-px w-12 bg-primary" />
                      <span className="text-xs font-mono text-primary uppercase tracking-widest">
                        DEVELOPER_API
                      </span>
                    </div>

                    <h3 className="text-4xl md:text-5xl font-black text-white font-syne mb-6 leading-[0.9] uppercase">
                      <span className="block">API &</span>
                      <span className="block">MCP</span>
                    </h3>

                    <p className="text-lg text-white/60 font-mono leading-relaxed max-w-md mx-auto lg:mx-0 mb-6">
                      Full REST API access for automation. MCP (Model Context Protocol) for
                      real-time sync with AI coding assistants. Build integrations that fit your
                      workflow.
                    </p>

                    <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                      <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs font-mono text-white/60">
                        REST API
                      </span>
                      <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs font-mono text-white/60">
                        WebSocket
                      </span>
                      <span className="px-3 py-1.5 bg-primary/20 border border-primary/30 rounded text-xs font-mono text-primary">
                        MCP Protocol
                      </span>
                      <span className="px-3 py-1.5 bg-white/5 border border-white/10 rounded text-xs font-mono text-white/60">
                        TypeScript SDK
                      </span>
                    </div>
                  </motion.div>
                </div>
              </section>
            </div>
          </div>
        </section>

        {/* Pro Plan Promo - Glowing Card */}
        <ProPlanPromo />

        {/* Architecting Reality - Flowing Layout with Stats */}
        <section className="py-32 lg:py-48 px-6 relative overflow-hidden">
          {/* Section header - centered */}
          <div className="max-w-7xl mx-auto mb-20 text-center">
            <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}>
              <span className="text-[10px] font-mono text-primary tracking-[0.3em] uppercase mb-6 block">
                SHIPS FASTER. STAYS CREATIVE.
              </span>
              <h2 className="text-4xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight font-mono leading-[0.9]">
                <span className="text-white">ARCHITECTING</span>
                <span className="text-white/20"> REALITY</span>
              </h2>
            </motion.div>
          </div>

          {/* Split Layout: Massive Icon + Stats Card */}
          <div className="max-w-7xl mx-auto relative lg:flex lg:items-center lg:gap-20">
            {/* Left Side: Massive 3D Icon (The "Big Fucking Icon") */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="hidden lg:block lg:w-1/2 relative h-[800px] -ml-20"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <ThreeDIcon type="STR_TST" color="#5c7cfa" size={700} />
              </div>
            </motion.div>

            {/* Right Side: High Contrast Stats Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="lg:w-1/2"
            >
              <div className="bg-[#f0f0f0] rounded-sm p-12 md:p-16 text-black shadow-2xl relative overflow-hidden">
                <div className="flex flex-col gap-12 relative z-10">
                  {/* Stat Model 1 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-7xl md:text-8xl font-black font-syne tracking-tighter leading-none">
                        1M+
                      </span>
                      <Plus className="w-8 h-8 text-primary mt-2" strokeWidth={4} />
                    </div>
                    <div className="h-px w-full bg-black/10 my-2" />
                    <div className="flex flex-col">
                      <span className="font-bold text-lg">Polygons Rendered/Sec</span>
                      <span className="text-black/60 font-mono text-sm">
                        Real-time throughput for massive worlds.
                      </span>
                    </div>
                  </div>

                  {/* Stat Model 2 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-7xl md:text-8xl font-black font-syne tracking-tighter leading-none">
                        4,000+
                      </span>
                      <Plus className="w-8 h-8 text-primary mt-2" strokeWidth={4} />
                    </div>
                    <div className="h-px w-full bg-black/10 my-2" />
                    <div className="flex flex-col">
                      <span className="font-bold text-lg">Assets Generated</span>
                      <span className="text-black/60 font-mono text-sm">
                        Unique assets created by users this week.
                      </span>
                    </div>
                  </div>

                  {/* Stat Model 3 */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="text-7xl md:text-8xl font-black font-syne tracking-tighter leading-none">
                        94%
                      </span>
                    </div>
                    <div className="h-px w-full bg-black/10 my-2" />
                    <div className="flex flex-col">
                      <span className="font-bold text-lg">Code Written by AI</span>
                      <span className="text-black/60 font-mono text-sm">
                        Our engines simulate complex logic so you don't have to.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Decorative background element for the card */}
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
              </div>
            </motion.div>
          </div>
        </section>

        {/* Our Manifesto - BOLD BLOCK */}
        <section className="py-24 relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full bg-[#ff4400] text-black py-32 px-6 overflow-hidden relative"
          >
            {/* Texture overlay */}
            <div
              className="absolute inset-0 opacity-[0.4] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg width=\'20\' height=\'20\' viewBox=\'0 0 20 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%23000000\' fill-opacity=\'1\' fill-rule=\'evenodd\'%3E%3Ccircle cx=\'3\' cy=\'3\' r=\'1\'/%3E%3Ccircle cx=\'13\' cy=\'13\' r=\'1\'/%3E%3C/g%3E%3C/svg%3E")',
                backgroundSize: '12px 12px',
              }}
            />

            <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 bg-black rounded-full" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-black/60">
                    The Manifesto
                  </span>
                </div>

                <h2 className="text-6xl md:text-8xl font-black leading-[0.85] font-syne tracking-tight">
                  WE DON&apos;T
                  <br />
                  <span className="text-black/30">REPLACE</span>
                  <br />
                  CREATORS
                </h2>
              </div>

              <div className="space-y-8 lg:border-l lg:border-black/10 lg:pl-16">
                <p className="text-2xl font-bold font-syne leading-tight max-w-xl">
                  &ldquo;AI isn&apos;t here to paint the picture. It&apos;s here to stretch the
                  canvas.&rdquo;
                </p>
                <div className="space-y-4">
                  <p className="font-mono text-sm font-bold uppercase tracking-widest mb-4 opacity-50">
                    Core Beliefs
                  </p>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center shrink-0">
                      1
                    </div>
                    <p className="font-mono text-sm leading-relaxed">
                      Automate the drudgery, not the discovery.
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center shrink-0">
                      2
                    </div>
                    <p className="font-mono text-sm leading-relaxed">
                      Your taste is the only thing that can't be generated.
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full border border-black/20 flex items-center justify-center shrink-0">
                      3
                    </div>
                    <p className="font-mono text-sm leading-relaxed">
                      Tools should be dangerous enough to build something new.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Giant Background Watermark */}
            <div className="absolute -bottom-24 -right-24 text-[30vw] font-black font-syne text-black opacity-[0.05] leading-none pointer-events-none select-none">
              ART
            </div>
          </motion.div>
        </section>

        {/* CTA Footer */}
        <footer className="py-32 px-6 relative border-t border-white/5 overflow-hidden">
          <div className="absolute inset-0 z-0 bg-transparent" />
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-[10px] font-mono text-primary tracking-[0.4em] uppercase mb-6 block">
                START FREE • NO CREDIT CARD
              </span>
              <h2 className="text-5xl md:text-7xl font-black mb-6 uppercase tracking-tighter font-syne">
                Build your first
                <br />
                <span className="text-primary">world today</span>
              </h2>
              <p className="text-white/40 font-mono text-sm mb-12 max-w-md mx-auto">
                Join 2,000+ game developers shipping faster with AI-powered tools.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link
                href="/login"
                className="group relative inline-flex items-center gap-3 px-8 py-4 text-sm font-bold text-white transition-all duration-300 rounded-lg overflow-hidden border border-primary/60 hover:border-primary bg-primary/20 hover:bg-primary/30 backdrop-blur-sm shadow-[0_0_30px_-10px_rgba(92,124,250,0.4)] hover:shadow-[0_0_40px_-8px_rgba(92,124,250,0.6)] hover:scale-[1.03] font-syne tracking-wide"
              >
                <Plus className="w-4 h-4" />
                START BUILDING FREE
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/docs"
                className="group inline-flex items-center gap-2 px-6 py-4 text-sm font-bold text-white/60 hover:text-white transition-all duration-300 border border-transparent hover:border-white/10 rounded-lg hover:bg-white/5 font-mono"
              >
                Read the docs
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </motion.div>

            <div className="flex justify-center gap-8 mt-12 text-[10px] font-mono tracking-widest text-white/40">
              <Link href="/terms" className="hover:text-primary transition-colors">
                TERMS_OF_SERVICE
              </Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">
                PRIVACY_POLICY
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </TurbulentBackground>
  )
}
