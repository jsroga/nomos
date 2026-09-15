import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { Workspace, LocalFilesystem } from '@mastra/core/workspace'
import { env } from '@/shared/config/env'
import { resolveProjectRoot } from '@/shared/agent-kernel/mastra/project-root'
import {
  StudioSandboxDir,
  StudioSandboxId,
} from '@/shared/agent-kernel/mastra/constants/studio-workspace'

export function resolveStudioSandboxPath(): string {
  return path.join(resolveProjectRoot(), StudioSandboxDir.Relative)
}

export function shouldCreateStudioSandbox(): boolean {
  return !env.VERCEL
}

function createContainedFilesystem(id: StudioSandboxId, basePath: string): LocalFilesystem {
  mkdirSync(basePath, { recursive: true })
  return new LocalFilesystem({
    id,
    basePath,
    contained: true,
  })
}

/** One Studio filesystem for every agent that inherits the instance workspace. */
export function createInstanceStudioWorkspace(): Workspace | undefined {
  if (!shouldCreateStudioSandbox()) return undefined
  return new Workspace({
    id: StudioSandboxId.InstanceWorkspace,
    filesystem: createContainedFilesystem(
      StudioSandboxId.Filesystem,
      resolveStudioSandboxPath(),
    ),
  })
}
