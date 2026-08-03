import { cacheLife } from 'next/cache'
import { LandingHeroAbVariant, LandingPage } from '@/domains/marketing'

enum LandingBodyCacheLife {
  Hours = 'hours',
}

type CachedLandingBodyProps = {
  readonly headlineVariant: LandingHeroAbVariant
}

/**
 * Shared marketing body — cached per headline variant.
 * Lives under app/ so it is not re-exported from the client-safe marketing barrel.
 */
export async function CachedLandingBody({ headlineVariant }: CachedLandingBodyProps) {
  'use cache'
  cacheLife(LandingBodyCacheLife.Hours)
  return <LandingPage headlineVariant={headlineVariant} />
}
