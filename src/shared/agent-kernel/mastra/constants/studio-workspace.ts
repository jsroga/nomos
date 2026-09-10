/** Studio instance filesystem — secrets-free, not the repo root. */

export enum StudioSandboxDir {
  Relative = '.local/mastra-studio-sandbox',
}

export enum StudioSandboxId {
  Filesystem = 'studio-sandbox',
  InstanceWorkspace = 'studio-instance',
}

export enum StudioSandboxSecretName {
  EnvLocal = '.env.local',
  Env = '.env',
  Git = '.git',
  NodeModules = 'node_modules',
}

export const STUDIO_AGENT_DESCRIPTION_MAX = 160
