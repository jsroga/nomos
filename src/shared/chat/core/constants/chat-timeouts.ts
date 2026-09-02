/** One stuck-chat budget. Client timer, route maxDuration, and author generate all derive from this. */
export const CHAT_ROUTE_MAX_DURATION_SECONDS = 180
export const CHAT_STUCK_TIMEOUT_MS = CHAT_ROUTE_MAX_DURATION_SECONDS * 1_000
/** Author generate must finish inside the stuck window so planner + critics still fit. */
export const CHAT_AUTHOR_GENERATE_TIMEOUT_MS = 90_000
