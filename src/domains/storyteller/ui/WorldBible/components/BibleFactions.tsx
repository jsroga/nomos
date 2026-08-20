import type { FC } from 'react'
import { Crown } from 'lucide-react'
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
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()

  const localFactions = localPlan.factions || []
  const displayFactions = bibleMergedDisplayList(isEditing, localPlan.factions, storyPlan.factions)
  const displayCards = displayFactions.flatMap(faction => {
    const card = factionCardFromUnknown(faction)
    return card ? [card] : []
  })
  const isLoading = loadingSections?.factions?.loading ?? false
  const pendingAction = pendingActions?.factions

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
        onGenerate={
          onSendMessage
            ? () =>
                onSendMessage(
                  'Generate completely BRAND NEW major factions, power structures, and political forces in this world. Each faction needs a short titled name (2–6 words, same length as a world-rule or event name) and the full summary in the description field. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated factions.',
                  'factions'
                )
            : undefined
        }
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
