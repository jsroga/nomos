import { useState, useCallback } from 'react'
import { clearInterruptedStream } from '@/shared/data/chat-persistence'
import { DEFAULT_RESUME_URL } from '../core/constants/chat-stream'
import { resumeChatWorkflow } from '../core/io/chat-ui.api'
import {
  USE_CHAT_STREAM_LOG_RESUME_ERROR,
  USE_CHAT_STREAM_LOG_RESUME_FAILED,
  USE_CHAT_STREAM_LOG_WORKFLOW_RESUMED,
} from './constants/use-chat-stream-log'

interface UseChatStreamResumeOptions {
  persistKey?: string
  resumeUrl?: string
}

export function useChatStreamResume({
  persistKey,
  resumeUrl = DEFAULT_RESUME_URL,
}: UseChatStreamResumeOptions) {
  const [wasStreamingOnLoad, setWasStreamingOnLoad] = useState(false)

  const dismissInterruptedWarning = useCallback(() => {
    setWasStreamingOnLoad(false)
    if (persistKey) {
      clearInterruptedStream(persistKey)
    }
  }, [persistKey])

  const resumeWorkflow = useCallback(
    async (
      runId: string,
      selectedOption: string,
      additionalFeedback?: string
    ): Promise<boolean> => {
      try {
        const { ok, result, errorText } = await resumeChatWorkflow(resumeUrl, {
          runId,
          selectedOption,
          additionalFeedback,
        })

        if (!ok) {
          console.error(USE_CHAT_STREAM_LOG_RESUME_FAILED, errorText)
          return false
        }

        console.log(USE_CHAT_STREAM_LOG_WORKFLOW_RESUMED, result)
        return true
      } catch (error) {
        console.error(USE_CHAT_STREAM_LOG_RESUME_ERROR, error)
        return false
      }
    },
    [resumeUrl]
  )

  return {
    wasStreamingOnLoad,
    setWasStreamingOnLoad,
    dismissInterruptedWarning,
    resumeWorkflow,
  }
}
