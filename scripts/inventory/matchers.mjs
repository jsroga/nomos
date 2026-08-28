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
