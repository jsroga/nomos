/** One stuck-chat budget. Client timer, route maxDuration, and author generate all derive from this. */
export const CHAT_ROUTE_MAX_DURATION_SECONDS = 300
export const CHAT_STUCK_TIMEOUT_MS = CHAT_ROUTE_MAX_DURATION_SECONDS * 1_000
/** Single author generate() ceiling. Must stay below the stuck window so planner + parallel critics still fit. */
export const CHAT_AUTHOR_GENERATE_TIMEOUT_MS = 150_000
