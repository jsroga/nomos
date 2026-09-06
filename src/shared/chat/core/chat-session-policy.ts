import { AppModuleId } from '@/shared/data/constants/protocol'
import { isLoopCreatorEnabled } from '@/shared/data/constants/feature-flags'
import { ChatSessionSendDecision } from '@/shared/chat/core/constants/chat-session'

export function moduleHasAgent(moduleId: AppModuleId): boolean {
  switch (moduleId) {
    case AppModuleId.Storyteller:
      return true
    case AppModuleId.LoopCreator:
      return isLoopCreatorEnabled()
    case AppModuleId.WorldBuilding:
    case AppModuleId.InteriorDesigner:
    case AppModuleId.AssetExporter:
      return false
    default:
      return false
  }
}

export function canSendToSession(
  sessionModuleId: AppModuleId,
  currentModuleId: AppModuleId,
  currentModuleHasAgent: boolean,
): ChatSessionSendDecision {
  if (!currentModuleHasAgent) return ChatSessionSendDecision.ModuleHasNoAgent
  if (sessionModuleId !== currentModuleId) return ChatSessionSendDecision.ModuleMismatch
  return ChatSessionSendDecision.Ok
}

export function parseWorkspaceModuleId(pathname: string): AppModuleId | null {
  const segments = pathname.split('/').filter(segment => segment.length > 0)
  const moduleSegment = segments[1]
  switch (moduleSegment) {
    case AppModuleId.Storyteller:
      return AppModuleId.Storyteller
    case AppModuleId.LoopCreator:
      return AppModuleId.LoopCreator
    case AppModuleId.WorldBuilding:
      return AppModuleId.WorldBuilding
    case AppModuleId.InteriorDesigner:
      return AppModuleId.InteriorDesigner
    case AppModuleId.AssetExporter:
      return AppModuleId.AssetExporter
    default:
      return null
  }
}
