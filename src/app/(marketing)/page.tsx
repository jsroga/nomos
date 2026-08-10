import { Suspense } from 'react'
import { cookies, headers } from 'next/headers'
import {
  LandingHeroAbCookie,
  LandingHeroAbHeader,
  LandingHeroAbVariant,
  LandingPage,
  parseHeroAbCookieValue,
} from '@/domains/marketing'
import { CachedLandingBody } from './CachedLandingBody'

function LandingAbFallback() {
  return <LandingPage headlineVariant={LandingHeroAbVariant.A} />
}

async function LandingWithAb() {
  const [jar, hdrs] = await Promise.all([cookies(), headers()])
  const headlineVariant =
    parseHeroAbCookieValue(hdrs.get(LandingHeroAbHeader.Name) ?? undefined) ??
    parseHeroAbCookieValue(jar.get(LandingHeroAbCookie.Name)?.value) ??
    LandingHeroAbVariant.A

  return <CachedLandingBody headlineVariant={headlineVariant} />
}

/** Public landing — A/B is a Suspense hole; body is Cache Components. */
export default function Page() {
  return (
    <Suspense fallback={<LandingAbFallback />}>
      <LandingWithAb />
    </Suspense>
  )
}
