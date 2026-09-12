import type { QueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AppModuleId } from '@/shared/data/constants/protocol'
import { queueNewWorkspaceChat } from '@/shared/chat/state/queue-new-workspace-chat'
import {
  LOOP_CREATOR_CHAT_START_FAILED,
  LOOP_LOG_CHAT_START_FAILED,
} from '@/domains/loop-creator/constants/loop-creator-auto-start'
import { buildLoopCreatorAutoStartPrompt } from '@/domains/loop-creator/utils/loop-creator-auto-start'

export type LoopPendingAutoPrompt = {
  id: number
  text: string
}

export async function startLoopCreatorGenerationChat(input: {
  projectId: string
  gameConcept: string
  queryClient: QueryClient
  overlayEnabled: boolean
  setPendingAutoPrompt: (prompt: LoopPendingAutoPrompt | null) => void
}): Promise<void> {
  const text = buildLoopCreatorAutoStartPrompt(input.gameConcept)

  if (!input.overlayEnabled) {
    input.setPendingAutoPrompt({ id: Date.now(), text })
    return
  }

  try {
    await queueNewWorkspaceChat({
      projectId: input.projectId,
      moduleId: AppModuleId.LoopCreator,
      text,
      queryClient: input.queryClient,
    })
  } catch (error) {
    console.error(LOOP_LOG_CHAT_START_FAILED, error)
    toast.error(LOOP_CREATOR_CHAT_START_FAILED)
  }
}
