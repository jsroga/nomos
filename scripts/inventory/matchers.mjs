/** Named matchers for the inventory harness. One per spec that measures. */

export const ProcessEnvBucket = {
  /** Inlined by Next at build time; must stay a literal member expression. */
  Public: 'public',
  /**
   * Supplied by the runtime rather than by us — the platform sets them and a
   * schema could not validate them before they are needed.
   */
  Runtime: 'runtime',
  /** A write, not a read: outbound configuration for an SDK to pick up. */
  Write: 'write',
  /** Already behind the config module. */
  Config: 'config',
  /** Everything else — what SPEC-12 migrates. */
  Server: 'server',
}

const PROCESS_ENV_READ = /process\.env\.[A-Z_0-9]+/
const PROCESS_ENV_WRITE = /process\.env\.[A-Z_0-9]+\s*=[^=]/
const CONFIG_MODULE = 'shared/config'

/** Set by the platform or the test runner, never by configuration. */
const RUNTIME_PROVIDED = ['NODE_ENV', 'NEXT_RUNTIME', 'VITEST', 'PORT']

/** SPEC-12: every `process.env.X` occurrence, classified by why it is there. */
export function classifyProcessEnvRead(line, file) {
  if (!PROCESS_ENV_READ.test(line)) return null
  if (file.split('\\').join('/').includes(CONFIG_MODULE)) return ProcessEnvBucket.Config
  if (PROCESS_ENV_WRITE.test(line)) return ProcessEnvBucket.Write
  if (line.includes('process.env.NEXT_PUBLIC_')) return ProcessEnvBucket.Public
  if (RUNTIME_PROVIDED.some(name => line.includes(`process.env.${name}`))) {
    return ProcessEnvBucket.Runtime
  }
  return ProcessEnvBucket.Server
}
