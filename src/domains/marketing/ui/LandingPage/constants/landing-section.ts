/** Full-bleed border + surface — translucent so the liquid backdrop still reads. */
export const LANDING_SECTION_PANEL_CLASS =
  'relative w-full overflow-hidden border-y border-white/[0.06] bg-[hsl(240_10%_3.9%/0.55)]' as const

/** Shared content width for section interiors + hero intro. */
export const LANDING_SECTION_CONTAINER_CLASS = 'relative z-10 mx-auto w-full max-w-7xl px-6' as const

/** One vertical rhythm for every landing section. */
export const LANDING_SECTION_PAD_Y_CLASS = 'py-28 md:py-32' as const

/** Full-bleed decorative layer (textures, 3D, noise) — never captures clicks. */
export const LANDING_ABSOLUTE_OVERLAY_CLASS =
  'absolute inset-0 pointer-events-none opacity-30' as const

/** Below-fold scroll reveal — never apply to above-the-fold blocks. */
export const LANDING_REVEAL_VIEWPORT = { once: true, amount: 0.12 } as const

export const LANDING_REVEAL_TRANSITION = {
  duration: 0.6,
  ease: [0.22, 0.61, 0.36, 1] as const,
}

export const LANDING_REVEAL_INITIAL = { opacity: 0, y: 28 } as const
export const LANDING_REVEAL_ANIMATE = { opacity: 1, y: 0 } as const
