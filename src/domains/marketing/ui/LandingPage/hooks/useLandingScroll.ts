'use client'

import { useEffect, useRef } from 'react'
import { useMotionValue, useScroll, useSpring, useTransform } from 'motion/react'
import {
  LANDING_HERO_OPACITY_RANGE,
  LANDING_HERO_SCROLL_SPRING,
  LANDING_HERO_Y_RANGE,
  LANDING_SCROLL_OVERLAY_RANGE,
  LandingScrollEvent,
  LandingScrollOffset,
} from '@/domains/marketing/ui/LandingPage/constants/landing-scroll'

export function useLandingScroll() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: [LandingScrollOffset.StartStart, LandingScrollOffset.EndEnd],
  })
  const smoothProgress = useSpring(scrollYProgress, LANDING_HERO_SCROLL_SPRING)
  const heroYInputStart: number = LANDING_HERO_Y_RANGE.inputStart
  const heroYInputEnd: number = LANDING_HERO_Y_RANGE.inputEnd
  const heroYOutputStart: number = LANDING_HERO_Y_RANGE.outputStart
  const heroYOutputEnd: number = LANDING_HERO_Y_RANGE.outputEnd
  const heroOpacityInputStart: number = LANDING_HERO_OPACITY_RANGE.inputStart
  const heroOpacityInputEnd: number = LANDING_HERO_OPACITY_RANGE.inputEnd
  const heroOpacityOutputStart: number = LANDING_HERO_OPACITY_RANGE.outputStart
  const heroOpacityOutputEnd: number = LANDING_HERO_OPACITY_RANGE.outputEnd
  const heroY = useTransform(
    smoothProgress,
    [heroYInputStart, heroYInputEnd],
    [heroYOutputStart, heroYOutputEnd],
  )
  const heroOpacity = useTransform(
    smoothProgress,
    [heroOpacityInputStart, heroOpacityInputEnd],
    [heroOpacityOutputStart, heroOpacityOutputEnd],
  )
  const scrollY = useMotionValue(0)

  useEffect(() => {
    const handleScroll = () => scrollY.set(window.scrollY)
    window.addEventListener(LandingScrollEvent.Scroll, handleScroll, { passive: true })
    return () => window.removeEventListener(LandingScrollEvent.Scroll, handleScroll)
  }, [scrollY])

  const bgOverlayOpacity = useTransform(
    scrollY,
    [LANDING_SCROLL_OVERLAY_RANGE.start, LANDING_SCROLL_OVERLAY_RANGE.end],
    [0, LANDING_SCROLL_OVERLAY_RANGE.opacityEnd],
  )

  return { containerRef, heroY, heroOpacity, bgOverlayOpacity }
}
