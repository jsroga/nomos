'use client'

import { AnimatePresence, motion } from 'motion/react'
import { Play, X } from 'lucide-react'
import { useState } from 'react'
import { ViewportGatedThreeDIcon } from '@/domains/marketing/ui/ViewportGatedThreeDIcon'
import { LANDING_BRAND_ACCENT } from '@/domains/marketing/ui/LandingPage/constants/landing-copy'
import { LandingDeepDiveUiCopy } from '@/domains/marketing/ui/LandingPage/constants/landing-ui-copy'
import {
  LANDING_ABSOLUTE_OVERLAY_CLASS,
  LANDING_SECTION_CONTAINER_CLASS,
  LANDING_SECTION_PAD_Y_CLASS,
  LANDING_SECTION_PANEL_CLASS,
} from '@/domains/marketing/ui/LandingPage/constants/landing-section'
import {
  FeatureDeepDiveAlign,
  type FeatureDeepDiveConfig,
} from '@/domains/marketing/ui/LandingPage/types'

type FeatureDeepDiveProps = FeatureDeepDiveConfig

export function FeatureDeepDive({
  title,
  subtitle,
  description,
  type3d,
  align = FeatureDeepDiveAlign.Left,
  index,
  color = LANDING_BRAND_ACCENT,
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
  pngIcon,
}: FeatureDeepDiveProps) {
  const [isLightboxOpen, setIsLightboxOpen] = useState(false)
  const layoutId = `screenshot-${index}`

  return (
    <section className={`${LANDING_SECTION_PANEL_CLASS} ${LANDING_SECTION_PAD_Y_CLASS}`}>
      <div className="pointer-events-none absolute bottom-0 left-1/2 top-0 hidden w-px -translate-x-1/2 bg-white/5 lg:block" />

      <div
        className={`${LANDING_SECTION_CONTAINER_CLASS} flex flex-col items-center gap-16 lg:flex-row lg:gap-28 ${align === FeatureDeepDiveAlign.Right ? 'lg:flex-row-reverse' : ''}`}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative w-full flex-1"
        >
          <div className="group relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-[#050505] lg:aspect-[4/3]">
            <div className={LANDING_ABSOLUTE_OVERLAY_CLASS}>
              <ViewportGatedThreeDIcon
                type={type3d}
                posterSrc={pngIcon}
                posterAlt={title}
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

            <div className="absolute inset-0 z-10 flex items-center justify-center p-6">
              <motion.div
                layoutId={layoutId}
                onClick={() => setIsLightboxOpen(true)}
                className="flex aspect-video w-[85%] cursor-pointer items-center justify-center rounded-lg border-2 border-white/20 bg-black/80 backdrop-blur-md transition-all duration-300 group-hover:border-white/40 hover:scale-[1.02]"
              >
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg border border-white/20 bg-white/5 transition-colors group-hover:bg-white/10">
                    <Play className="h-5 w-5 text-white/60" />
                  </div>
                  <span className="font-mono text-xs tracking-widest text-white/50">
                    {LandingDeepDiveUiCopy.ClickToPreview}
                  </span>
                </div>
              </motion.div>
            </div>

            <div className="absolute left-4 top-4 z-20 flex gap-2">
              <div
                className="h-2 w-2 animate-pulse rounded-full"
                style={{ backgroundColor: color }}
              />
              <div className="font-mono text-[10px] tracking-widest text-white/40">{subtitle}</div>
            </div>

            <div className="absolute left-0 top-0 z-20 h-4 w-4 border-l border-t border-white/20" />
            <div className="absolute right-0 top-0 z-20 h-4 w-4 border-r border-t border-white/20" />
            <div className="absolute bottom-0 left-0 z-20 h-4 w-4 border-b border-l border-white/20" />
            <div className="absolute bottom-0 right-0 z-20 h-4 w-4 border-b border-r border-white/20" />
          </div>
        </motion.div>

        <AnimatePresence>
          {isLightboxOpen ? (
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
                className="relative aspect-video w-[90vw] max-w-5xl overflow-hidden rounded-xl border-2 border-white/20 bg-black/90"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-xl border border-white/20 bg-white/5">
                      <Play className="h-10 w-10 text-white/60" />
                    </div>
                    <h4 className="mb-2 font-syne text-2xl font-bold text-white">{title}</h4>
                    <span className="font-mono text-sm tracking-widest text-white/40">
                      {LandingDeepDiveUiCopy.ScreenshotPreview}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setIsLightboxOpen(false)}
                  className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
                >
                  <X className="h-5 w-5 text-white" />
                </button>

                <div className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-white/30" />
                <div className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-white/30" />
                <div className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white/30" />
                <div className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white/30" />
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, x: align === FeatureDeepDiveAlign.Left ? 50 : -50 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex-1 text-center lg:text-left"
        >
          <div
            className={`mb-10 flex items-center gap-4 ${align === FeatureDeepDiveAlign.Right ? 'lg:flex-row-reverse' : ''} justify-center lg:justify-start`}
          >
            <span className="font-mono text-4xl font-black text-white/10">0{index}</span>
            <div className="h-px w-12 bg-primary" />
            <span className="font-mono text-xs uppercase tracking-widest text-primary">
              {subtitle}
            </span>
          </div>

          <h3 className="mb-10 font-syne text-3xl font-black uppercase leading-[1.05] text-white md:text-5xl">
            {title.split(' ').map((word, i) => (
              <span key={i} className="mb-2 block last:mb-0">
                {word}
              </span>
            ))}
          </h3>

          <p className="mx-auto max-w-md font-sans text-lg leading-relaxed text-white/60 lg:mx-0">
            {description}
          </p>
        </motion.div>
      </div>
    </section>
  )
}
