/** Auth page style class strings (eslint-exempt constants folder). */

export const RESET_PASSWORD_STYLES = {
  INPUT:
    'h-12 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 text-[15px] text-white placeholder:text-white/30 transition-[border-color,box-shadow] duration-[160ms] focus-visible:border-[hsl(235_88%_65%/0.65)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(235_88%_65%/0.22)] focus-visible:ring-offset-0',
  ERROR: 'text-red-400 text-xs mt-1',
} as const

export const LOGIN_PAGE_STYLES = {
  INPUT: RESET_PASSWORD_STYLES.INPUT,
  ERROR: RESET_PASSWORD_STYLES.ERROR,
  LABEL:
    'font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-white/45',
  SUBMIT:
    'group inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[hsl(235_88%_65%)] font-syne text-[13px] font-extrabold uppercase tracking-[0.1em] text-white shadow-[0_8px_24px_-8px_hsl(235_88%_65%/0.6)] transition-all duration-200 hover:-translate-y-px hover:bg-[hsl(235_88%_70%)]',
  SOCIAL:
    'inline-flex h-12 w-full items-center justify-center gap-3 rounded-lg border border-white/[0.13] bg-white/[0.05] text-[14px] font-medium text-white transition-colors duration-200 hover:border-white/25 hover:bg-white/[0.09]',
} as const
