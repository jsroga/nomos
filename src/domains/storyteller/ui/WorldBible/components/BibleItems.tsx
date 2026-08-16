import type { FC } from 'react'
import { Package } from 'lucide-react'
import { useBible } from './BibleContext'
import { BibleSimpleEntitySection } from './BibleSimpleEntitySection'
import { bibleMergedDisplayList } from '../utils/bible-section-items'

export const BibleItems: FC = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateItem,
    addItem,
    removeItem,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()

  const localItems = localPlan.items || []
  const displayItems = bibleMergedDisplayList(isEditing, localPlan.items, storyPlan.items)
  const isLoading = loadingSections?.items?.loading ?? false

  return (
    <BibleSimpleEntitySection
      icon={<Package className="w-5 h-5 text-amber-500/80" />}
      title="Notable Items & Objects"
      loadingMessage="Forging items..."
      emptyEditMessage="No items defined. Click + to add one."
      emptyDisplayMessage="No items defined. The world is empty of artifacts."
      generatePrompt="Generate completely BRAND NEW, significant items, artifacts, weapons, or objects of power in this world. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated items."
      generateTitle="Generate Items"
      addTitle="Add Item"
      sectionKey="items"
      localItems={localItems}
      displayItems={displayItems}
      isEditing={isEditing}
      isReadOnly={isReadOnly}
      isLoading={isLoading}
      pendingAction={pendingActions?.items}
      onSendMessage={onSendMessage}
      projectId={projectId}
      onAdd={addItem}
      onRemove={removeItem}
      onUpdate={(idx, field, value) => updateItem(idx, field, value)}
    />
  )
}
