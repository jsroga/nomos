'use client'

import { useMemo } from 'react'
import { TOUR_STEP_IDS } from '@/shared/tours/tour-constants'
import { DomainSidebar } from '@/components/DomainSidebar'
import { AssistantChat } from '@/shared/chat/assistant/AssistantChat'
import { WRITERS_ROOM_SUGGESTIONS } from '@/domains/storyteller/config/constants/writers-room'
import { getStorytellerMentionProviders } from '@/domains/storyteller/ui/MentionsProvider/providers'
import { buildStorytellerProjectContext } from '@/domains/storyteller/ui/MentionsProvider/build-storyteller-project-context'
import { getGameEntityProvider } from '@/shared/chat/core/mentions/game-entity-provider'
import {
  recordFromJson,
  recordArrayFromJson,
  stringArrayFromJson,
} from '@/shared/data/json-guards'
import type { StorytellerPageSlices } from '@/domains/storyteller/state/hooks/useStorytellerPage'

/**
 * Writers Room chat — on assistant-ui (roadmap B4). Streams the registered
 * `storyteller` chat-adapter agent, with `@`-mentions from the storyteller
 * providers and quick-action suggestions. HITL questions / action-approval
 * board-sync are re-homed via tool UIs (tracked).
 */
export function StorytellerWritersRoom(props: StorytellerPageSlices) {
  const { routeProjectId, characters, beats, storyPlan } = props.core

  const projectId = routeProjectId ?? ''
  const mentionProviders = useMemo(
    () => [...getStorytellerMentionProviders(), getGameEntityProvider()],
    []
  )
  const mentionProjectContext = useMemo(() => {
    const plan = recordFromJson(storyPlan)
    return buildStorytellerProjectContext({
      projectId,
      characters,
      episodes: [],
      beats,
      seriesBible: {
        ...plan,
        worldRules: recordArrayFromJson(plan.worldRules),
        inspirations: recordFromJson(plan.inspirations),
        soundtracks: recordArrayFromJson(plan.soundtracks),
        plotTwists: stringArrayFromJson(plan.plotTwists),
        factions: recordArrayFromJson(plan.factions),
      },
    })
  }, [projectId, characters, beats, storyPlan])

  return (
    <DomainSidebar header={null} position="right" storageKey="writers-room" defaultWidth={384} rawContent>
      <div className="flex h-full flex-col" id={TOUR_STEP_IDS.STORYTELLER_CHAT}>
        <AssistantChat
          agentId="storyteller"
          suggestions={WRITERS_ROOM_SUGGESTIONS}
          mentionProviders={mentionProviders}
          mentionProjectContext={mentionProjectContext}
          persistKey={`writers-room-${projectId}`}
        />
      </div>
    </DomainSidebar>
  )
}
