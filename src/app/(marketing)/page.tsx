import { cookies, headers } from 'next/headers'
import {
  LandingHeroAbCookie,
  LandingHeroAbHeader,
  LandingHeroAbVariant,
  LandingPage,
  parseHeroAbCookieValue,
} from '@/domains/marketing'

/** Public landing — no auth providers; CTAs go to /login. */
export default async function Page() {
  const [jar, hdrs] = await Promise.all([cookies(), headers()])
  const headlineVariant =
    parseHeroAbCookieValue(hdrs.get(LandingHeroAbHeader.Name) ?? undefined) ??
    parseHeroAbCookieValue(jar.get(LandingHeroAbCookie.Name)?.value) ??
    LandingHeroAbVariant.A

  return <LandingPage headlineVariant={headlineVariant} />
}
