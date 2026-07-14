export const LANDING_SUBTITLES = [
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
] as const

export enum LandingNavItem {
  Systems = 'SYSTEMS',
  Docs = 'DOCS',
  Api = 'API',
}

export const LANDING_NAV_ITEMS = [
  LandingNavItem.Systems,
  LandingNavItem.Docs,
  LandingNavItem.Api,
] as const

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

export const LANDING_BRAND_ACCENT = '#5c7cfa'

export enum LandingHeadlineLine {
  Build = 'BUILD',
  Worlds = 'WORLDS',
  Bleed = 'THAT BLEED',
}

export enum LandingHeroCopy {
  Tagline1 = 'AI-powered game dev toolkit.',
  Tagline2 = '10x faster iteration.',
  Tagline3 = 'Ship games, not busywork.',
  StartBuilding = 'START BUILDING FREE',
  WatchDemo = 'WATCH DEMO',
  Dashboard = 'Dashboard',
  GetStarted = 'Get Started',
}

export enum LandingSystemsCopy {
  Eyebrow = 'INFRASTRUCTURE_MODULES',
  TitleAi = 'AI',
  TitleArsenal = ' ARSENAL',
  Subtitle = 'AI TOOLS • BUILD FASTER • SHIP BETTER',
}
