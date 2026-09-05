import type { FC } from 'react'
import { Crown } from 'lucide-react'
import { StorytellerPromptRegistryId } from '@/domains/storyteller/ai/prompts/registry/prompt-registry-ids'
import { BibleSection } from '@/domains/storyteller/core/types/enums'
import { runBibleSectionArtifactDraft } from '../utils/artifact-draft-overlay'
import { BibleEntityTileClass } from '../../BibleEntityTile'
import { FactionCard, factionCardFromUnknown } from '../../FactionCard'
import { useBible } from './BibleContext'
import { BibleSectionHeader, BibleSectionShell } from './BibleSectionChrome'
import { FactionEditList } from './FactionEditList'
import { bibleMergedDisplayList } from '../utils/bible-section-items'

export const BibleFactions: FC = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateFaction,
    addFaction,
    removeFaction,
    isReadOnly,
    loadingSections,
    pendingActions,
    projectId,
    setPendingAction,
  } = useBible()

  const localFactions = localPlan.factions || []
  const displayFactions = bibleMergedDisplayList(isEditing, localPlan.factions, storyPlan.factions)
  const displayCards = displayFactions.flatMap(faction => {
    const card = factionCardFromUnknown(faction)
    return card ? [card] : []
  })
  const isLoading = loadingSections?.factions?.loading ?? false
  const pendingAction = pendingActions?.factions

  const handleGenerate = async () => {
    await runBibleSectionArtifactDraft({
      projectId,
      section: BibleSection.FACTIONS,
      promptId: StorytellerPromptRegistryId.BibleFactionsGenerate,
      setPendingAction,
    })
  }

  return (
    <BibleSectionShell
      isLoading={isLoading}
      loadingMessage="Building power structures..."
      pendingAction={pendingAction}
    >
      <BibleSectionHeader
        icon={<Crown className="w-5 h-5 text-amber-400/80" />}
        title="Factions"
        isEditing={isEditing}
        isReadOnly={isReadOnly}
        isLoading={isLoading}
        onAdd={addFaction}
        addTitle="Add Faction"
        onGenerate={handleGenerate}
        generateTitle="Generate Factions"
      />
      {isEditing ? (
        <FactionEditList
          factions={localFactions}
          onChange={updateFaction}
          onRemove={removeFaction}
        />
      ) : displayCards.length === 0 ? (
        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
          No factions defined. Power is a vacuum.
        </div>
      ) : (
        <div className={BibleEntityTileClass.Grid}>
          {displayCards.map((faction, idx) => (
            <FactionCard key={idx} faction={faction} projectId={projectId} />
          ))}
        </div>
      )}
    </BibleSectionShell>
  )
}
