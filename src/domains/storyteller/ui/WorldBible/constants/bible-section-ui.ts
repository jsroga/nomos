/** Story plan array keys used by bible context mutations. */
export enum BiblePlanArrayKey {
  WorldRules = 'worldRules',
  Factions = 'factions',
  KeyCharacters = 'keyCharacters',
  Sequences = 'sequences',
  Items = 'items',
  Events = 'events',
}

export enum BibleSectionChromeClass {
  DisabledWhenLoading = 'pointer-events-none opacity-50',
  DefaultSpinner = 'text-purple-400',
}

export enum BibleInspirationCategoryKey {
  Books = 'books',
  Movies = 'movies',
  Games = 'games',
}

export const BIBLE_INSPIRATION_CATEGORY_CONFIG = [
  {
    key: BibleInspirationCategoryKey.Books,
    label: 'Books',
    searchSuffix: 'book',
    colorClass: 'text-emerald-400/70',
  },
  {
    key: BibleInspirationCategoryKey.Movies,
    label: 'Movies',
    searchSuffix: 'movie',
    colorClass: 'text-rose-400/70',
  },
  {
    key: BibleInspirationCategoryKey.Games,
    label: 'Games',
    searchSuffix: 'game',
    colorClass: 'text-violet-400/70',
  },
] as const

export const BIBLE_INSPIRATION_GENERATE_PROMPT =
  'Generate BRAND NEW diverse inspirations for this world - include relevant books, movies, and games. For each, provide the exact title and 1-2 sentences describing what it is and why it\'s thematically relevant. IMPORTANT: Take a completely new creative direction and do NOT repeat previous suggestions.'
