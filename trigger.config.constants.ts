/** Wire values for `trigger.config.ts` (root config — keep magic strings out of the config file). */

export enum TriggerRuntime {
  Node = 'node',
}

export enum TriggerLogLevel {
  Log = 'log',
}

export enum TriggerBuildExternal {
  DrizzleOrm = 'drizzle-orm',
}

export enum TriggerEnvFile {
  Local = '.env.local',
}

export const TRIGGER_PROJECT_REF = 'proj_wkorovfruzqhizygormk'
export const TRIGGER_DIRS = ['./src/trigger'] as const
