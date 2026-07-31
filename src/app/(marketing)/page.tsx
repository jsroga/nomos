import { LandingPage } from '@/domains/marketing'

/** Public landing — no auth providers; CTAs go to /login. */
export default function Page() {
  return <LandingPage />
}
