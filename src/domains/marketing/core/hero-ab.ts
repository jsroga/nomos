import {
  LANDING_HERO_AB_DEFAULT_PCT,
  LandingHeroAbEnv,
  LandingHeroAbVariant,
} from '@/domains/marketing/constants/hero-ab'

export type LandingHeroAbWeights = {
  readonly aPct: number
  readonly bPct: number
}

/** Parse 0–100 integer; invalid → null. */
export function parseHeroAbPct(raw: string | undefined): number | null {
  if (raw === undefined || raw.trim() === '') return null
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 0 || n > 100) return null
  return n
}

/**
 * Resolve A/B weights from env strings.
 * Missing → 50/50. One side set → other is remainder. Both set → normalize to 100.
 */
export function resolveHeroAbWeights(
  aRaw: string | undefined,
  bRaw: string | undefined,
): LandingHeroAbWeights {
  const aParsed = parseHeroAbPct(aRaw)
  const bParsed = parseHeroAbPct(bRaw)

  if (aParsed === null && bParsed === null) {
    return { aPct: LANDING_HERO_AB_DEFAULT_PCT, bPct: LANDING_HERO_AB_DEFAULT_PCT }
  }
  if (aParsed !== null && bParsed === null) {
    return { aPct: aParsed, bPct: 100 - aParsed }
  }
  if (aParsed === null && bParsed !== null) {
    return { aPct: 100 - bParsed, bPct: bParsed }
  }

  const a = aParsed ?? LANDING_HERO_AB_DEFAULT_PCT
  const b = bParsed ?? LANDING_HERO_AB_DEFAULT_PCT
  const sum = a + b
  if (sum === 0) {
    return { aPct: LANDING_HERO_AB_DEFAULT_PCT, bPct: LANDING_HERO_AB_DEFAULT_PCT }
  }
  if (sum === 100) return { aPct: a, bPct: b }
  return {
    aPct: Math.round((a / sum) * 100),
    bPct: 100 - Math.round((a / sum) * 100),
  }
}

/** `roll` in [0, 100) — values `< aPct` → A, else B. */
export function assignHeroAbVariant(
  weights: LandingHeroAbWeights,
  roll: number,
): LandingHeroAbVariant {
  const clamped = Math.min(99.999, Math.max(0, roll))
  return clamped < weights.aPct ? LandingHeroAbVariant.A : LandingHeroAbVariant.B
}

export function parseHeroAbCookieValue(
  value: string | undefined,
): LandingHeroAbVariant | null {
  if (value === LandingHeroAbVariant.A) return LandingHeroAbVariant.A
  if (value === LandingHeroAbVariant.B) return LandingHeroAbVariant.B
  return null
}

type EnvBag = Readonly<Record<string, string | undefined>>

/** Read process env for middleware / server (literal keys for clarity). */
export function heroAbWeightsFromEnv(env: EnvBag = process.env): LandingHeroAbWeights {
  return resolveHeroAbWeights(env[LandingHeroAbEnv.APct], env[LandingHeroAbEnv.BPct])
}
