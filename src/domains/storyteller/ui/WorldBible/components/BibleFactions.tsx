import type { FC } from 'react'
import { Crown } from 'lucide-react'
import { FactionSchema } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { FactionCard } from '../../FactionCard'
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
                  'Generate completely BRAND NEW major factions, power structures, and political forces in this world. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated factions.',
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
      ) : displayFactions.length === 0 ? (
        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
          No factions defined. Power is a vacuum.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayFactions.map((faction, idx) => {
            const parsed = FactionSchema.safeParse(faction)
            if (!parsed.success) return null
            return <FactionCard key={idx} faction={parsed.data} projectId={projectId} />
          })}
        </div>
      )}
    </BibleSectionShell>
  )
}
