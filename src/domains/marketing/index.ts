/**
 * Marketing public module API (client-safe).
 * Server-only helpers (e.g. loadLegalMarkdown) live in ./core/legal-docs — import there.
 */

export { ApiDocsPage } from './ui/ApiDocs/components/ApiDocsPage'
export { GlobalLiquidLoader } from './ui/GlobalLiquidLoader'
export { LandingPage } from './ui/LandingPage'
export { Liquid } from './ui/Liquid'
export { LiquidBackgroundProvider } from './ui/LiquidBackgroundProvider'
export { MarketingVoiceLine } from './ui/MarketingVoiceLine'
export { VoiceLineAlign } from './constants/voice-line'
export { ProPlanPromo } from './ui/ProPlanPromo'
export { ThreeDIcon } from './ui/ThreeDIcon'
export { ToolsIntegration } from './ui/ToolsIntegration'
export { TurbulentBackground } from './ui/TurbulentBackground'
export { LANDING_HERO_HEADLINES, LandingExternalUrl } from './ui/LandingPage/constants/landing-copy'
export {
  LandingLoginBrandCopy,
  LandingNavUiCopy,
} from './ui/LandingPage/constants/landing-ui-copy'
export { LiquidProvider, useLiquid } from './state/liquid-context'
export {
  assignHeroAbVariant,
  heroAbWeightsFromEnv,
  parseHeroAbCookieValue,
  resolveHeroAbWeights,
} from './core/hero-ab'
export {
  LANDING_HERO_AB_COOKIE_MAX_AGE_SEC,
  LANDING_HERO_AB_DEFAULT_PCT,
  LandingHeroAbCookie,
  LandingHeroAbEnv,
  LandingHeroAbHeader,
  LandingHeroAbVariant,
} from './constants/hero-ab'
