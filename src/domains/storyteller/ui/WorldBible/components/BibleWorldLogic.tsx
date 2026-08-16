import type { FC } from 'react'
import { Scale, Trash2 } from 'lucide-react'
import type { WorldRule } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import {
  parseWorldRuleCategory,
  worldRuleForDisplay,
  WorldRuleCategory,
} from '@/domains/storyteller/core/entities/world-rule-wire'
import { BibleEntityTileClass } from '../../BibleEntityTile'
import { WorldRuleCard } from '../../WorldRuleCard'
import { useBible } from './BibleContext'
import { BibleSectionHeader, BibleSectionShell } from './BibleSectionChrome'
import { bibleSectionItems, planItems } from '../utils/bible-section-items'
import type { PendingAction } from '../utils/bible-context-types'

const WorldRuleEditItem: FC<{
  rule: WorldRule
  idx: number
  onChange: <K extends keyof WorldRule>(index: number, field: K, value: WorldRule[K]) => void
  onRemove: (index: number) => void
}> = ({ rule, idx, onChange, onRemove }) => (
  <div className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
    <div className="flex items-start justify-between">
      <select
        className="p-2 bg-background border border-border rounded text-sm"
        value={rule.category}
        onChange={e => {
          const category = parseWorldRuleCategory(e.target.value)
          if (category) onChange(idx, 'category', category)
        }}
      >
        {Object.values(WorldRuleCategory).map(cat => (
          <option key={cat} value={cat}>
            {cat}
          </option>
        ))}
      </select>
      <button
        onClick={() => onRemove(idx)}
        className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
        title="Remove Rule"
        type="button"
      >
        <Trash2 size={14} />
      </button>
    </div>
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Short title..."
      value={rule.name || ''}
      onChange={e => onChange(idx, 'name', e.target.value)}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="The rule..."
      value={rule.rule || ''}
      onChange={e => onChange(idx, 'rule', e.target.value)}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Consequence if broken..."
      value={rule.consequence || ''}
      onChange={e => onChange(idx, 'consequence', e.target.value)}
    />
    <input
      type="text"
      className="w-full p-2 bg-background border border-border rounded text-sm"
      placeholder="Exceptions (optional)..."
      value={rule.exceptions || ''}
      onChange={e => onChange(idx, 'exceptions', e.target.value || null)}
    />
  </div>
)

const WorldRulesSection: FC<{
  isLoading: boolean
  pending?: PendingAction
  isEditing: boolean
  isReadOnly: boolean
  onSendMessage?: (msg: string, section?: string) => void
  onAddWorldRule: () => void
  localRules: WorldRule[]
  displayRules: WorldRule[]
  onWorldRuleChange: <K extends keyof WorldRule>(index: number, field: K, value: WorldRule[K]) => void
  onRemoveWorldRule: (index: number) => void
  projectId: string
}> = ({
  isLoading,
  pending,
  isEditing,
  isReadOnly,
  onSendMessage,
  onAddWorldRule,
  localRules,
  displayRules,
  onWorldRuleChange,
  onRemoveWorldRule,
  projectId,
}) => (
  <BibleSectionShell
    isLoading={isLoading}
    loadingMessage="Crafting world rules..."
    spinnerClassName="text-amber-400"
    pendingAction={pending}
  >
    <BibleSectionHeader
      icon={<Scale className="w-5 h-5 text-purple-400/80" />}
      title="World Logic"
      isEditing={isEditing}
      isReadOnly={isReadOnly}
      isLoading={isLoading}
      onAdd={onAddWorldRule}
      addTitle="Add World Rule"
      onGenerate={
        onSendMessage
          ? () =>
              onSendMessage(
                'Generate BRAND NEW fundamental laws and rules that govern this world - magic systems, physics, social contracts, etc. Each rule needs a short titled name (2–6 words, same length as a faction or event name) and the full law in the rule field. Mention examples of excellent world rules like in Death Note, Case of Golden Idol (game), Game of Thrones, Pluribus. IMPORTANT: Take a completely new creative direction and do NOT repeat previous rules.',
                'worldRules'
              )
          : undefined
      }
      generateTitle="Generate World Rules"
    />
    {isEditing ? (
      <div className="space-y-4">
        {localRules.length === 0 ? (
          <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
            No world rules defined. Click + to add one.
          </div>
        ) : (
          localRules.map((rule, idx) => (
            <WorldRuleEditItem
              key={idx}
              rule={rule}
              idx={idx}
              onChange={onWorldRuleChange}
              onRemove={onRemoveWorldRule}
            />
          ))
        )}
      </div>
    ) : displayRules.length === 0 ? (
      <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
        No world rules defined yet. The laws of nature (or magic) are unspoken.
      </div>
    ) : (
      <div className={BibleEntityTileClass.Grid}>
        {displayRules.map((rule, idx) => {
          const display = worldRuleForDisplay(rule)
          if (!display) return null
          return <WorldRuleCard key={idx} rule={display} projectId={projectId} />
        })}
      </div>
    )}
  </BibleSectionShell>
)

export const BibleWorldLogic: FC = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateWorldRule,
    addWorldRule,
    removeWorldRule,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
    projectId,
  } = useBible()

  const localRules = planItems<WorldRule>(localPlan.worldRules)
  const displayRules = bibleSectionItems<WorldRule>(localPlan.worldRules, storyPlan.worldRules, isEditing)

  return (
    <WorldRulesSection
      isLoading={loadingSections?.worldRules?.loading ?? false}
      pending={pendingActions?.worldRules}
      isEditing={isEditing}
      isReadOnly={isReadOnly}
      onSendMessage={onSendMessage}
      onAddWorldRule={addWorldRule}
      localRules={localRules}
      displayRules={displayRules}
      onWorldRuleChange={updateWorldRule}
      onRemoveWorldRule={removeWorldRule}
      projectId={projectId}
    />
  )
}
