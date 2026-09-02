/**
 * Load `.env.local` before any module that reads configuration.
 *
 * `@/shared/config/env` parses `process.env` **once at import** (SPEC-12), and
 * ES imports execute before the importing module's body — so `dotenv.config()`
 * inside `runEval()` ran far too late. Every judge model was built with no
 * OpenRouter key, the AI SDK threw `AI_LoadAPIKeyError`, and the runner
 * recorded the failure as a score of 0.
 *
 * Import this first, before anything else, in every eval entrypoint.
 */
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

const LOCAL_ENV_FILE = '.env.local'

const localPath = path.resolve(process.cwd(), LOCAL_ENV_FILE)
if (fs.existsSync(localPath)) {
  dotenv.config({ path: localPath, quiet: true })
} else {
  dotenv.config({ quiet: true })
}
