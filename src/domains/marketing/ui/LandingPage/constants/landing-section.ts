/** Shared frosted panel chrome for landing sections. */

export const LANDING_SECTION_PANEL_CLASS =
  'py-24 border-y border-white/5 bg-black/40 backdrop-blur-sm relative overflow-hidden' as const

/** Full-bleed decorative layer (textures, 3D, noise) — never captures clicks. */
export const LANDING_ABSOLUTE_OVERLAY_CLASS =
  'absolute inset-0 pointer-events-none opacity-30' as const
