import type { FC } from 'react'
import { Package } from 'lucide-react'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { runBibleSectionArtifactDraft } from '../utils/artifact-draft-overlay'
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
    loadingSections,
    pendingActions,
    projectId,
    setPendingAction,
  } = useBible()

  const localItems = localPlan.items || []
  const displayItems = bibleMergedDisplayList(isEditing, localPlan.items, storyPlan.items)
  const isLoading = loadingSections?.items?.loading ?? false

  const handleGenerate = async () => {
    await runBibleSectionArtifactDraft({
      projectId,
      section: BibleSection.ITEMS,
      promptId: StorytellerPromptRegistryId.BibleItemsGenerate,
      setPendingAction,
    })
  }

  return (
    <BibleSimpleEntitySection
      icon={<Package className="w-5 h-5 text-amber-500/80" />}
      title="Notable Items & Objects"
      loadingMessage="Forging items..."
      emptyEditMessage="No items defined. Click + to add one."
      emptyDisplayMessage="No items defined. The world is empty of artifacts."
      generateTitle="Generate Items"
      addTitle="Add Item"
      localItems={localItems}
      displayItems={displayItems}
      isEditing={isEditing}
      isReadOnly={isReadOnly}
      isLoading={isLoading}
      pendingAction={pendingActions?.items}
      onGenerate={handleGenerate}
      projectId={projectId}
      onAdd={addItem}
      onRemove={removeItem}
      onUpdate={(idx, field, value) => updateItem(idx, field, value)}
    />
  )
}
