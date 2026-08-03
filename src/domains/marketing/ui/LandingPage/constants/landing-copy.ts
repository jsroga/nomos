import { LandingHeroAbVariant } from '@/domains/marketing/constants/hero-ab'

export const LANDING_SUBTITLES: readonly string[] = [
  'Play god. It’s cheaper than therapy.',
  'Your reality is boring. Make a new one.',
  'Build a world before this one ends.',
  'No one will miss the old timeline.',
  'Architect your own escape.',
  'Simulation theory is real. You are the admin.',
  'Reality is a suggestion. Ignore it.',
  'The void is waiting for your input.',
  'Create something that outlives you.',
  'Sanity is optional here.',
]

export enum LandingNavItem {
  Systems = 'SYSTEMS',
  Docs = 'DOCS',
  Api = 'API',
}

export const LANDING_NAV_ITEMS: readonly LandingNavItem[] = [
  LandingNavItem.Systems,
  LandingNavItem.Docs,
  LandingNavItem.Api,
]

export enum LandingExternalUrl {
  DocsReadme = 'https://github.com/jsroga/kurvitza#readme',
  ApiDocs = 'https://github.com/jsroga/kurvitza/tree/main/docs',
  GitHubRepo = 'https://github.com/jsroga/world-building-kit',
  Login = '/login',
  Projects = '/projects',
  Terms = '/terms',
  Privacy = '/privacy',
}

export enum LandingSectionId {
  Systems = 'systems',
}

export enum LandingHeroDomId {
  TerrainSlot = 'landing-hero-terrain',
}

export const LANDING_BRAND_ACCENT = '#5c7cfa'

export type LandingHeroHeadlineLines = {
  readonly line1: string
  readonly line2: string
  readonly line3: string
}

export const LANDING_HERO_HEADLINES: Record<
  LandingHeroAbVariant,
  LandingHeroHeadlineLines
> = {
  [LandingHeroAbVariant.A]: {
    line1: 'SHIP',
    line2: 'GAMES',
    line3: 'NOT BUSYWORK',
  },
  [LandingHeroAbVariant.B]: {
    line1: 'BUILD',
    line2: 'FASTER',
    line3: 'SHIP BETTER',
  },
}

export enum LandingHeroCopy {
  VoiceLine = 'Build worlds that bleed',
  SubCopy = 'AI-powered game dev toolkit — 10× faster iteration so you ship games, not busywork.',
  MetaLine = 'AI TOOLKIT · WORLDS · NARRATIVE · LOOPS',
  Reassurance = 'Start free · No credit card',
  StartBuilding = 'START BUILDING FREE',
  WatchDemo = 'WATCH DEMO',
  Dashboard = 'Dashboard',
  GetStarted = 'Get started',
  SignIn = 'Sign in',
  Tagline1 = 'AI-powered game dev toolkit.',
  Tagline2 = '10x faster iteration.',
  Tagline3 = 'Ship games, not busywork.',
}

export enum LandingSystemsCopy {
  Eyebrow = 'INFRASTRUCTURE_MODULES',
  TitleAi = 'AI',
  TitleArsenal = ' ARSENAL',
  Subtitle = 'AI TOOLS • BUILD FASTER • SHIP BETTER',
}
