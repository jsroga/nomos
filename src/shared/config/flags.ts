/**
 * Non-secret switches, deliberately without `server-only`.
 *
 * `./env` guards secrets, so it imports `server-only` and cannot be reached
 * from a client component or from build tooling running under `tsx`. These are
 * booleans that turn logging on; they carry nothing worth protecting, and
 * `storyteller-config.ts` is reachable from the OpenAPI generator, so putting
 * them behind that guard would break the build for no benefit.
 *
 * `local/no-bare-process-env` exempts `shared/config`, which is why the reads
 * below are legal here and nowhere else.
 */
import { ENV_FLAG_ON } from '@/shared/config/constants/env'

function isOn(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === ENV_FLAG_ON
}

export const flags = {
  storytellerVerbose: isOn(process.env.STORYTELLER_VERBOSE),
  storytellerLogDecisions: isOn(process.env.STORYTELLER_LOG_DECISIONS),
  storytellerLogRag: isOn(process.env.STORYTELLER_LOG_RAG),
} as const
