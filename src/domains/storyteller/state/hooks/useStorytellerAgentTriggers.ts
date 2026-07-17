'use client'

import { useCallback, useEffect, useRef } from 'react'
import { type Message } from '@/shared/chat'
import {
  StorytellerLogMessage,
  StorytellerMessageRole,
  StorytellerMessageType,
  StorytellerThreadId,
  StorytellerPremiseSection,
  StorytellerPremiseSectionLabel,
  StorytellerStreamMode,
  StorytellerWorldBuildingPhase,
} from '@/domains/storyteller/core/storyteller-page-wire'
import { postStorytellerChatStream } from '@/domains/storyteller/core/io/chat.api'
import { Phase } from '@/domains/storyteller/core/types/enums'
import {
  StorytellerAgentTriggerPrompt,
} from '@/domains/storyteller/state/constants/agent-trigger-prompts'
import type { StorytellerWorkspaceCore } from './useStorytellerPageBase'
import type { useStorytellerChat } from './useStorytellerChat'

type ChatSlice = ReturnType<typeof useStorytellerChat>

function premiseSectionLabel(section: string | null | undefined): string {
  if (section === StorytellerPremiseSection.ProtagonistHook) {
    return StorytellerPremiseSectionLabel.ProtagonistHook
  }
  if (section === StorytellerPremiseSection.FatalFlaw) {
    return StorytellerPremiseSectionLabel.FatalFlaw
  }
  if (section === StorytellerPremiseSection.InevitableConsequence) {
    return StorytellerPremiseSectionLabel.InevitableConsequence
  }
  return section ?? ''
}

export function useStorytellerAgentTriggers(core: StorytellerWorkspaceCore, chat: ChatSlice) {
  const { currentProject, currentEpisodeId, characters, setGeneratingSection } = core
  const { setMessages, setIsSending, processStream } = chat

  const sharedAbortRef = useRef(chat.abortControllerRef)
  useEffect(() => {
    sharedAbortRef.current = chat.abortControllerRef
  })

  const runAgentStream = useCallback(
    async (
      userContent: string,
      agentMessage: string,
      phase: string,
      scope: { threadId?: string; episodeId?: string | null } = {}
    ) => {
      const userMsg: Message = {
        sender: StorytellerMessageRole.User,
        content: userContent,
        type: StorytellerMessageType.Human,
      }
      setMessages(prev => [...prev, userMsg])
      setIsSending(true)

      const threadId = scope.threadId ?? currentEpisodeId ?? StorytellerThreadId.General
      const episodeId = scope.episodeId !== undefined ? scope.episodeId : currentEpisodeId

      const payload = {
        message: agentMessage,
        projectId: currentProject?.id,
        threadId,
        episodeId,
        currentPhase: phase,
        seriesBible: {
          ...(currentProject?.series_bible ?? {}),
          masterPrompt: currentProject?.master_prompt || '',
        },
        characters,
        streamMode: StorytellerStreamMode.Events,
        progressiveGeneration: true,
      }

      const abortController = new AbortController()
      sharedAbortRef.current.current = abortController

      try {
        const res = await postStorytellerChatStream(payload, {
          signal: abortController.signal,
        })
        await processStream(res, abortController.signal)
      } catch (err) {
        console.error(StorytellerLogMessage.TriggerError, err)
      }
    },
    [characters, currentEpisodeId, currentProject, processStream, setIsSending, setMessages]
  )

  const generateEpisodePremise = useCallback(() => {
    void runAgentStream(
      StorytellerAgentTriggerPrompt.GenerateEpisodePremiseUser,
      StorytellerAgentTriggerPrompt.GenerateEpisodePremiseAgent,
      Phase.PREMISE
    )
  }, [runAgentStream])

  const generateEpisodePremiseSection = useCallback(
    (section: string) => {
      setGeneratingSection(section)
      const readableSection = premiseSectionLabel(section)

      void runAgentStream(
        `${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionUserPrefix}${readableSection}${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionUserSuffix}`,
        `${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionAgentPrefix}${readableSection}${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionAgentMid}${section}${StorytellerAgentTriggerPrompt.RegeneratePremiseSectionAgentSuffix}`,
        Phase.PREMISE
      )
    },
    [runAgentStream, setGeneratingSection]
  )

  const generateRoadmap = useCallback(() => {
    void runAgentStream(
      StorytellerAgentTriggerPrompt.GenerateRoadmapUser,
      StorytellerAgentTriggerPrompt.GenerateRoadmapAgent,
      StorytellerWorldBuildingPhase.WorldBuilding,
      { threadId: StorytellerThreadId.General, episodeId: null }
    )
  }, [runAgentStream])

  return {
    generateEpisodePremise,
    generateEpisodePremiseSection,
    generateRoadmap,
  }
}
