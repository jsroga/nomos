import type { FC } from 'react'
import { CalendarHeart } from 'lucide-react'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { requestBibleSectionChatRefresh } from '../utils/bible-section-chat-refresh'
import { useBible } from './BibleContext'
import { BibleSimpleEntitySection } from './BibleSimpleEntitySection'
import { bibleMergedDisplayList } from '../utils/bible-section-items'

export const BibleEvents: FC = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateEvent,
    addEvent,
    removeEvent,
    isReadOnly,
    loadingSections,
    pendingActions,
    projectId,
    onSendMessage,
  } = useBible()

  const localEvents = localPlan.events || []
  const displayEvents = bibleMergedDisplayList(isEditing, localPlan.events, storyPlan.events)
  const isLoading = loadingSections?.events?.loading ?? false

  const handleGenerate = () => {
    requestBibleSectionChatRefresh({
      onSendMessage,
      section: BibleSection.EVENTS,
      promptId: StorytellerPromptRegistryId.BibleEventsGenerate,
    })
  }

  return (
    <BibleSimpleEntitySection
      icon={<CalendarHeart className="w-5 h-5 text-rose-500/80" />}
      title="Historical Events"
      loadingMessage="Pacing history..."
      emptyEditMessage="No events defined. Click + to add one."
      emptyDisplayMessage="No events defined. History has not yet been written."
      generateTitle="Generate Events"
      addTitle="Add Event"
      localItems={localEvents}
      displayItems={displayEvents}
      isEditing={isEditing}
      isReadOnly={isReadOnly}
      isLoading={isLoading}
      pendingAction={pendingActions?.events}
      onGenerate={handleGenerate}
      projectId={projectId}
      onAdd={addEvent}
      onRemove={removeEvent}
      onUpdate={(idx, field, value) => updateEvent(idx, field, value)}
    />
  )
}
