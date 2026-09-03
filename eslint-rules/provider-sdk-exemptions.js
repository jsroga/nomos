/**
 * Files still allowed to reach a provider SDK directly — gate A2's remainder.
 *
 * Every entry is a **gap in the gateway migration**, not a decision, and is
 * counted by `providerSdkImportsOutsideGateway` in `.quality-ratchet.json`.
 * The list may only shrink.
 *
 * Lives in its own module so `eslint.config.js` and the ratchet test read the
 * same list rather than a regex over the config.
 */

/** Not gaps: these must never bill. */
const NEVER_BILLS = [
  'src/shared/ai/gateway/**/*.ts',
  // Judge calls must not enter llm_calls as production spend — see
  // shared/ai/gateway/__tests__/eval-isolation.test.ts.
  'src/shared/agent-kernel/scorers/**/*.ts',
  // Constructs model objects; generate happens at the call site.
  'src/shared/agent-kernel/models.ts',
  'src/domains/storyteller/config/constants/model-config.ts',
]

/** In `shared/`, so they keep the shared boundary patterns. */
const SHARED_REMAINDER = [
  // A provider wrapper that belongs under gateway/providers/ once image
  // generation is metered; moving it is its own change.
  'src/shared/ai/replicate.ts',
]

/** In `domains/` or `app/`, so they keep the domain boundary patterns. */
const DOMAIN_REMAINDER = [
  // Mastra tools whose `execute` receives only schema-declared args, so there
  // is no ProjectScope to bill against without changing every tool's input
  // contract — a field a model can silently omit.
  'src/domains/game-design/ai/tools/v2/game-design-llm-shared.ts',
  // Reached without a scope in hand. Threading one is the remaining work.
  'src/app/api/storyteller/generate-metrics/route.ts',
]

module.exports = {
  NEVER_BILLS,
  SHARED_REMAINDER,
  DOMAIN_REMAINDER,
  /** What the ratchet counts. */
  REMAINDER: [...SHARED_REMAINDER, ...DOMAIN_REMAINDER],
}
