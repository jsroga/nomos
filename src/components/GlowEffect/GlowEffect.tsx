'use client'

import { cn } from '@/shared/data/utils'
import { motion } from 'framer-motion'
import {
  GLOW_DEFAULT_COLORS,
  GLOW_GRADIENT_JOINER,
  GlowBlurClass,
  GlowBlurLevel,
  GlowEase,
  GlowEffectMode,
} from '@/components/GlowEffect/constants/glow-effect'

export type GlowEffectProps = {
  className?: string
  style?: React.CSSProperties
  colors?: string[]
  mode?: `${GlowEffectMode}`
  blur?: `${GlowBlurLevel}`
  duration?: number
  scale?: number
}

export function GlowEffect({
  className,
  style,
  colors = [...GLOW_DEFAULT_COLORS],
  mode = GlowEffectMode.Static,
  blur = GlowBlurLevel.Medium,
  duration = 3,
  scale = 1,
}: GlowEffectProps) {
  const blurClasses = {
    [GlowBlurLevel.Soft]: GlowBlurClass.Soft,
    [GlowBlurLevel.Medium]: GlowBlurClass.Medium,
    [GlowBlurLevel.Strong]: GlowBlurClass.Strong,
  }

  const backgroundStyle = {
    background: `conic-gradient(from 0deg at 50% 50%, ${colors.join(GLOW_GRADIENT_JOINER)})`,
  }

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 -z-10 h-full w-full', className)}
      style={{
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      <motion.div
        className={cn('h-full w-full rounded-[inherit] opacity-100', blurClasses[blur])}
        style={backgroundStyle}
        animate={mode === GlowEffectMode.ColorShift ? { rotate: 360 } : {}}
        transition={
          mode === GlowEffectMode.ColorShift
            ? { duration: duration, repeat: Infinity, ease: GlowEase.Linear }
            : {}
        }
      />
    </div>
  )
}
