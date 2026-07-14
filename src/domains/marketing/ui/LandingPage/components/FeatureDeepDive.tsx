'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Play, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { LANDING_BRAND_ACCENT } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import {
  LandingDeepDiveUiCopy,
} from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import { FeatureDeepDiveAlign, type FeatureDeepDiveConfig } from '@/domains/marketing/ui/LandingPage/types'

const ThreeDIcon = dynamic(() => import('../../ThreeDIcon').then(mod => mod.ThreeDIcon), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-white/5 animate-pulse rounded-full" />,
})

type FeatureDeepDiveProps = FeatureDeepDiveConfig

export function FeatureDeepDive({
  title,
  subtitle,
  description,
  type3d,
  align = FeatureDeepDiveAlign.Left,
  index,
  color = LANDING_BRAND_ACCENT,
  screenshotPlaceholder = true,
  modelScale = 0.5,
  modelOffsetX = 0,
  modelOffsetY = 0,
  density,
  glowScale,
  distortion = 0,
  speed = 1,
  frequency,
  contrast,
  twist,
  metalness,
  vignette = false,
}: FeatureDeepDiveProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const layoutId = `screenshot-${index}`

  return (
    <section className="py-24 relative">
      <div className="absolute left-[50%] top-0 bottom-0 w-px bg-white/5 hidden lg:block" />

      <div
        className={`flex flex-col lg:flex-row gap-12 lg:gap-24 items-center ${align === FeatureDeepDiveAlign.Right ? 'lg:flex-row-reverse' : ''}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex-1 w-full relative"
        >
          <div className="relative aspect-square lg:aspect-[4/3] rounded-lg overflow-hidden bg-[#050505] border border-white/10 group">
            <div className="absolute inset-0 pointer-events-none">
              <ThreeDIcon
                type={type3d}
                color={color}
                scale={modelScale}
                offset={[modelOffsetX, modelOffsetY]}
                density={density}
                glowScale={glowScale}
                distortion={distortion}
                speed={speed}
                frequency={frequency}
                contrast={contrast}
                twist={twist}
                metalness={metalness}
                vignette={vignette}
              />
            </div>

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
                    {LandingDeepDiveUiCopy.ClickToPreview}
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="absolute top-4 left-4 flex gap-2 z-20">
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ backgroundColor: color }}
              />
              <div className="text-[10px] font-mono text-white/40 tracking-widest">{subtitle}</div>
            </div>

            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-white/20 z-20" />
            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-white/20 z-20" />
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-white/20 z-20" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-white/20 z-20" />
          </div>
        </motion.div>

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
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-6 rounded-xl border border-white/20 bg-white/5 flex items-center justify-center">
                      <Play className="w-10 h-10 text-white/60" />
                    </div>
                    <h4 className="text-2xl font-syne font-bold text-white mb-2">{title}</h4>
                    <span className="text-white/40 font-mono text-sm tracking-widest">
                      {LandingDeepDiveUiCopy.ScreenshotPreview}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>

                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white/30" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white/30" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white/30" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white/30" />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, x: align === FeatureDeepDiveAlign.Left ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 text-center lg:text-left"
        >
          <div
            className={`flex items-center gap-4 mb-6 ${align === FeatureDeepDiveAlign.Right ? 'lg:flex-row-reverse' : ''} justify-center lg:justify-start`}
          >
            <span className="text-4xl font-mono text-white/10 font-black">0{index}</span>
            <div className="h-px w-12 bg-primary" />
            <span className="text-xs font-mono text-primary uppercase tracking-widest">
              {subtitle}
            </span>
          </div>

          <h3 className="text-3xl md:text-5xl font-black text-white font-syne mb-6 leading-[0.9] uppercase">
            {title.split(' ').map((word, i) => (
              <span key={i} className="block">
                {word}
              </span>
            ))}
          </h3>

          <p className="text-lg text-white/60 font-mono leading-relaxed max-w-md mx-auto lg:mx-0 mb-8">
            {description}
          </p>

          {screenshotPlaceholder && (
            <div className="relative aspect-video max-w-md mx-auto lg:mx-0 rounded-lg overflow-hidden border border-white/10 bg-black/50 group/screenshot hover:border-primary/30 transition-colors">
              <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-white/30" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-white/30" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-white/30" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-white/30" />

              <div className="absolute top-2 right-2 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-mono text-white/30 uppercase tracking-widest">
                {LandingDeepDiveUiCopy.PreviewLabel}
              </div>

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

              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/screenshot:opacity-100 transition-opacity duration-500" />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
