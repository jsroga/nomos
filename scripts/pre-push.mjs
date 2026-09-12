#!/usr/bin/env node
/**
 * Husky pre-push: lint/tsc/unit and file-selected e2e already ran at commit.
 * Full Playwright is nightly (`npm run test:e2e:nightly`).
 */
console.log(
  'pre-push: skipped live suites (file-selected smoke/e2e ran at commit; full Playwright is nightly)',
)
