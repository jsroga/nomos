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

export const ProviderSdkBucket = {
  Mastra: 'mastra',
  LangChain: 'langchain',
  AiSdk: 'ai-sdk',
  AiSdkProvider: 'ai-sdk-provider',
  OpenAi: 'openai',
  Replicate: 'replicate',
}

const GATEWAY_MODULE = 'shared/ai/gateway'

/** SPEC-13: every direct provider-SDK import, by which SDK it reaches for. */
export function classifyProviderSdkImport(line, file) {
  if (!line.includes('from \'')) return null
  if (file.split('\\').join('/').includes(GATEWAY_MODULE)) return null

  if (line.includes("from '@mastra/")) return ProviderSdkBucket.Mastra
  if (line.includes("from '@langchain/")) return ProviderSdkBucket.LangChain
  if (line.includes("from '@ai-sdk/")) return ProviderSdkBucket.AiSdkProvider
  if (line.includes("from 'ai'")) return ProviderSdkBucket.AiSdk
  if (line.includes("from 'openai'")) return ProviderSdkBucket.OpenAi
  if (line.includes("from 'replicate'")) return ProviderSdkBucket.Replicate
  return null
}

export const TriggerTaskBucket = {
  /** A `task(` / `schemaTask(` call that did not go through the factory. */
  RawTask: 'raw-task',
  /** A task built by `defineOwnedTask` — schema, queue and nonce guaranteed. */
  OwnedTask: 'owned-task',
  /** A `queue:` declaration on a task. */
  Queue: 'queue',
  /** A trigger call that bypasses `triggerOwnedRun`, so it carries no key. */
  UnkeyedTrigger: 'unkeyed-trigger',
  /** An import of the v3 subpath; CLAUDE.md mandates the v4 entrypoint. */
  SdkV3Import: 'sdk-v3-import',
}

const TASK_FACTORY_MODULE = 'shared/jobs/define-task'
const OWNED_RUN_MODULE = 'shared/jobs/owned-run'
const TASK_FILE_SUFFIX = '.task.ts'
const RAW_TASK_CALL = /\b(?:schemaT|t)ask\(\{/
const RAW_TRIGGER_CALL = /(?:\btasks\.trigger\b|\bTask\.trigger\(|[A-Za-z]\.trigger\()/

/** SPEC-14: the shape of the 19 background tasks, one bucket per omission. */
export function classifyTriggerTaskShape(line, file) {
  const path = file.split('\\').join('/')
  if (line.includes('@trigger.dev/sdk/v3')) return TriggerTaskBucket.SdkV3Import
  if (line.includes('defineOwnedTask(')) return TriggerTaskBucket.OwnedTask
  if (!path.includes(TASK_FACTORY_MODULE) && RAW_TASK_CALL.test(line)) {
    return TriggerTaskBucket.RawTask
  }
  if (path.endsWith(TASK_FILE_SUFFIX) && /^\s*queue:/.test(line)) return TriggerTaskBucket.Queue
  if (!path.includes(OWNED_RUN_MODULE) && RAW_TRIGGER_CALL.test(line)) {
    return TriggerTaskBucket.UnkeyedTrigger
  }
  return null
}

export const UntypedJsonBucket = {
  /** A shape re-derived at the reader instead of parsed at the edge. */
  Guard: 'guard',
  /** A database or provider spelling that escaped its mapper. */
  SnakeCaseRead: 'snake-case-read',
  /** A schema that forwards unknown keys — how an alias survives. */
  Passthrough: 'passthrough',
  /** `z.any()`: disables checking on everything downstream. */
  ZodAny: 'zod-any',
  /** Parsing at an edge — the direction this is moving in. */
  Parse: 'parse',
}

const CONTRACTS_DIRECTORY = '/contracts/'
/**
 * Marks a `.passthrough()` someone has decided about — a provider or model
 * boundary, where rejecting an unrecognised key would turn a working
 * generation into a crash. The counter measures the *undecided* ones, which is
 * what SPEC-16 Task 9 burns down.
 */
const DECIDED_PASSTHROUGH = 'contract-boundary:'
const IO_DIRECTORY = '/core/io/'
const JSON_GUARD_CALL = /\b(?:recordFromJson|readString|readNumber|stringArrayFromJson)\(/
/** `.some_field` — a property read, not a string literal or an import path. */
const SNAKE_CASE_READ = /\.[a-z][a-z0-9]*_[a-z0-9_]+\b/

/**
 * SPEC-16: where a shape is established. A guard inside `contracts/` or
 * `core/io/` is the parse itself; the same call anywhere else is a reader
 * re-deriving a shape nobody owns.
 */
export function classifyUntypedJsonRead(line, file) {
  // A doc comment describing `.passthrough()` is not a use of it.
  if (/^\s*(?:\*|\/\/)/.test(line)) return null
  const path = file.split('\\').join('/')
  const isEdge = path.includes(CONTRACTS_DIRECTORY) || path.includes(IO_DIRECTORY)

  if (line.includes('.passthrough()')) {
    return line.includes(DECIDED_PASSTHROUGH) ? null : UntypedJsonBucket.Passthrough
  }
  if (line.includes('z.any()')) return UntypedJsonBucket.ZodAny
  if (line.includes('.safeParse(')) return UntypedJsonBucket.Parse
  if (!isEdge && JSON_GUARD_CALL.test(line)) return UntypedJsonBucket.Guard
  if (!path.includes(CONTRACTS_DIRECTORY) && SNAKE_CASE_READ.test(line)) {
    return UntypedJsonBucket.SnakeCaseRead
  }
  return null
}

/** The domain module a source file belongs to, or null for shared/app code. */
export function moduleOf(file) {
  const match = file.split('\\').join('/').match(/^src\/domains\/([^/]+)\//)
  return match ? match[1] : null
}
