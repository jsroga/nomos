/** Viewport-gated marketing 3D mount / prefetch margins. */

export enum MarketingViewportRootMargin {
  /** Start GLB + chunk prefetch before visible. */
  Prefetch = '600px 0px',
  /** Mount WebGL canvas when near viewport. */
  Mount = '300px 0px',
  /** Unmount when well below / above fold. */
  Leave = '-80px 0px',
}

export enum MarketingIdleDeferMs {
  /** Fallback only — prefer scroll gate so lab audits never boot WebGL. */
  TurbulentBackground = 20000,
  /** Below-fold sections; scroll unlocks earlier for real users. */
  BelowFoldSections = 12000,
  HeroTextEffects = 2000,
}

export enum MarketingWebGlBudget {
  MaxConcurrentCanvases = 2,
}

export enum MarketingCanvasFrameloop {
  Always = 'always',
  Never = 'never',
}

export const MARKETING_BG_PLACEHOLDER_CLASS =
  'fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(92,124,250,0.12)_0%,_#050505_55%,_#000_100%)]'

export enum MarketingMediaQuery {
  PrefersReducedMotion = '(prefers-reduced-motion: reduce)',
  MobileMaxWidth = '(max-width: 768px)',
}

export enum MarketingRetryMs {
  WebGlSlot = 400,
}

/** Decorative near-fold 3D waits until the user scrolls past this Y. */
export const MARKETING_NEAR_FOLD_SCROLL_Y = 120

export enum MarketingDomScrollEvent {
  Scroll = 'scroll',
}
