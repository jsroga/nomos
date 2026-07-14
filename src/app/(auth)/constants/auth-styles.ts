/** Auth page style class strings (eslint-exempt constants folder). */

export const RESET_PASSWORD_STYLES = {
  INPUT:
    'bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/30',
  ERROR: 'text-red-400 text-xs mt-1',
} as const

export const LOGIN_PAGE_STYLES = {
  INPUT:
    'bg-black/30 border-white/10 text-white placeholder:text-white/30 focus:border-white/30',
  ERROR: RESET_PASSWORD_STYLES.ERROR,
} as const
