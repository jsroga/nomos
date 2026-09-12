import { MastraAgentVersionStatus } from './constants/editor'
import { overlayAgentHasInstructions } from './editor-overlay'

/**
 * handleChatStream refuses published when editor.instructions is true and the
 * overlay JSON has no instructions. Draft keeps the code brief.
 */
export function handleChatAgentVersion(agentId: string): {
  status: MastraAgentVersionStatus
} {
  return {
    status: overlayAgentHasInstructions(agentId)
      ? MastraAgentVersionStatus.Published
      : MastraAgentVersionStatus.Draft,
  }
}
