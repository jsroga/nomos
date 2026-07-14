/** Title-pattern keywords for categorizing flat inspiration lists. */

export const BIBLE_INSPIRATION_GAME_KEYWORDS = [
  '(game)',
  'video game',
  'bioshock',
  'rpg',
  'zelda',
  'souls',
] as const

export const BIBLE_INSPIRATION_MOVIE_KEYWORDS = [
  'film',
  'movie',
  'anime',
  'inside out',
  'weathering',
] as const

export const BIBLE_INSPIRATION_GAME_YEAR_PATTERN = /\(\d{4}\).*game/i
export const BIBLE_INSPIRATION_MOVIE_YEAR_PATTERN = /\(\d{4}\)$/
