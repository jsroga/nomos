/** Landing hero A/B — cookie + env split (server + edge-safe). */

export enum LandingHeroAbVariant {
  A = 'a',
  B = 'b',
}

export enum LandingHeroAbCookie {
  Name = 'lp_hero',
}

/** Middleware → RSC on first paint (cookie not yet on the request). */
export enum LandingHeroAbHeader {
  Name = 'x-lp-hero',
}

/** Seconds — sticky assignment across visits. */
export const LANDING_HERO_AB_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 90

export enum LandingHeroAbEnv {
  APct = 'LANDING_HERO_AB_A_PCT',
  BPct = 'LANDING_HERO_AB_B_PCT',
}

export const LANDING_HERO_AB_DEFAULT_PCT = 50
