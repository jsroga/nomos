/**
 * Preload for repo CLIs — MUST be the first import in the entry script.
 *
 * Two things have to happen before any `@/` module is evaluated:
 *
 * 1. **Env.** `src/db/client.ts` builds its pg `Pool` from `process.env.DATABASE_URL`
 *    at module scope. Static imports are evaluated before the entry script's own
 *    body runs, so a `dotenv.config()` call inside `main()` is always too late —
 *    the pool silently falls back to `''` and pg defaults to `localhost:5432`
 *    (ECONNREFUSED against a remote database that is configured correctly).
 *
 * 2. **`server-only`.** Storyteller services import Next's marker package, whose
 *    `index.js` unconditionally throws outside a Server Component. The package
 *    already ships an empty stub for the `react-server` condition; rather than
 *    flipping that condition globally (it would also swap React and several
 *    SDKs to their server builds), seed the module cache with an empty export
 *    so only this one specifier is neutralised.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import Module from 'node:module'
import * as dotenv from 'dotenv'

const ENV_FILE = '.env.local'
const SERVER_ONLY_SPECIFIER = 'server-only'

function loadEnvFile(): void {
  const envPath = path.resolve(process.cwd(), ENV_FILE)
  dotenv.config(fs.existsSync(envPath) ? { path: envPath } : undefined)
}

function stubServerOnly(): void {
  try {
    const resolved = require.resolve(SERVER_ONLY_SPECIFIER)
    const stub = new Module(resolved)
    stub.filename = resolved
    stub.loaded = true
    stub.exports = {}
    require.cache[resolved] = stub
  } catch {
    // Not installed (or already stubbed) — nothing to neutralise.
  }
}

loadEnvFile()
stubServerOnly()
