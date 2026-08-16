import type { FC } from 'react'
import { CalendarHeart } from 'lucide-react'
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
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()

  const localEvents = localPlan.events || []
  const displayEvents = bibleMergedDisplayList(isEditing, localPlan.events, storyPlan.events)
  const isLoading = loadingSections?.events?.loading ?? false

  return (
    <BibleSimpleEntitySection
      icon={<CalendarHeart className="w-5 h-5 text-rose-500/80" />}
      title="Historical Events"
      loadingMessage="Pacing history..."
      emptyEditMessage="No events defined. Click + to add one."
      emptyDisplayMessage="No events defined. History has not yet been written."
      generatePrompt="Generate the most important BRAND NEW historical events, tragedies, wars, and discoveries that shaped this world. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated events."
      generateTitle="Generate Events"
      addTitle="Add Event"
      sectionKey="events"
      localItems={localEvents}
      displayItems={displayEvents}
      isEditing={isEditing}
      isReadOnly={isReadOnly}
      isLoading={isLoading}
      pendingAction={pendingActions?.events}
      onSendMessage={onSendMessage}
      projectId={projectId}
      onAdd={addEvent}
      onRemove={removeEvent}
      onUpdate={(idx, field, value) => updateEvent(idx, field, value)}
    />
  )
}
