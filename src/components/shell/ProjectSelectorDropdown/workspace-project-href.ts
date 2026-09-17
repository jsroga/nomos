import { AppModuleId } from '@/shared/data/constants/protocol'
import { parseWorkspaceModuleId } from '@/shared/chat/core/chat-session-policy'

export function workspaceHrefForProject(pathname: string | null, nextProjectId: string): string {
  const moduleId = pathname ? parseWorkspaceModuleId(pathname) : null
  const segment = moduleId ?? AppModuleId.Storyteller
  return `/${nextProjectId}/${segment}`
}
