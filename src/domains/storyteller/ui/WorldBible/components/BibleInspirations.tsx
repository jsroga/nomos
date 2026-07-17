import { useMemo, type FC, type ReactNode } from 'react'
import { Lightbulb, Book, Film, Gamepad2 } from 'lucide-react'
import { InspirationItem } from '@/domains/storyteller/ai/prompts/schemas/agent-schemas'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { buildUrl } from '@/shared/data/url-builder'
import { useBible } from './BibleContext'
import { BibleSectionHeader, BibleSectionShell } from './BibleSectionChrome'
import {
  BIBLE_INSPIRATION_CATEGORY_CONFIG,
  BIBLE_INSPIRATION_GENERATE_PROMPT,
  BibleInspirationCategoryKey,
} from '../constants/bible-section-ui'
import {
  inspirationEditValue,
  normalizeInspirations,
} from '../utils/bible-inspiration-normalize'

interface BibleInspirationsProps {}

const InspirationLink: FC<{ title: string; description: string | null; searchSuffix: string }> = ({
  title,
  description,
  searchSuffix,
}) => {
  const link = (
    <a
      href={buildUrl('https://www.google.com/search', { q: `${title} ${searchSuffix}` })}
      target="_blank"
      rel="noopener noreferrer"
      className="block text-xs text-muted-foreground/70 font-sans hover:text-foreground transition-colors"
    >
      {title}
    </a>
  )
  if (!description) return link
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs font-sans text-xs">
        <p>{description}</p>
      </TooltipContent>
    </Tooltip>
  )
}

const InspirationCategory: FC<{
  icon: ReactNode
  colorClass: string
  label: string
  categoryKey: 'books' | 'movies' | 'games'
  searchSuffix: string
  isEditing: boolean
  editValue: string
  items: InspirationItem[]
  onChange: (key: 'books' | 'movies' | 'games', value: string) => void
}> = ({ icon, colorClass, label, categoryKey, searchSuffix, isEditing, editValue, items, onChange }) => (
  <div className="p-4 bg-muted/5 border border-border/30 rounded-xl">
    <div className={`flex items-center gap-2 mb-3 ${colorClass} font-mono text-[10px] uppercase tracking-widest`}>
      {icon} {label}
    </div>
    {isEditing ? (
      <textarea
        className="w-full h-16 p-2 bg-background border border-border rounded text-xs font-mono resize-none"
        placeholder="Comma separated..."
        value={editValue}
        onChange={e => onChange(categoryKey, e.target.value)}
      />
    ) : (
      <div className="space-y-1">
        {items.length ? (
          items.map((item, i) => (
            <InspirationLink
              key={i}
              title={typeof item === 'string' ? item : item.title}
              description={typeof item === 'object' ? item.description ?? null : null}
              searchSuffix={searchSuffix}
            />
          ))
        ) : (
          <div className="text-xs text-muted-foreground/40 font-sans italic">None</div>
        )}
      </div>
    )}
  </div>
)

const INSPIRATION_CATEGORY_ICONS: Record<BibleInspirationCategoryKey, ReactNode> = {
  [BibleInspirationCategoryKey.Books]: <Book className="w-3.5 h-3.5" />,
  [BibleInspirationCategoryKey.Movies]: <Film className="w-3.5 h-3.5" />,
  [BibleInspirationCategoryKey.Games]: <Gamepad2 className="w-3.5 h-3.5" />,
}

export const BibleInspirations: FC<BibleInspirationsProps> = () => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateInspiration,
    isReadOnly,
    onSendMessage,
    loadingSections,
    pendingActions,
  } = useBible()

  const isLoading = loadingSections?.inspirations?.loading ?? false
  const pendingAction = pendingActions?.inspirations

  const normalizedInspirations = useMemo(() => {
    const raw = isEditing ? localPlan.inspirations : localPlan.inspirations || storyPlan.inspirations
    return normalizeInspirations(raw)
  }, [isEditing, localPlan.inspirations, storyPlan.inspirations])

  return (
    <BibleSectionShell
      isLoading={isLoading}
      loadingMessage="Finding creative references..."
      spinnerClassName="text-yellow-400"
      pendingAction={pendingAction}
    >
      <BibleSectionHeader
        icon={<Lightbulb className="w-5 h-5 text-emerald-400/80" />}
        title="Inspirations"
        isReadOnly={isReadOnly}
        isLoading={isLoading}
        onGenerate={
          onSendMessage ? () => onSendMessage(BIBLE_INSPIRATION_GENERATE_PROMPT, 'inspirations') : undefined
        }
        generateTitle="Generate Inspirations"
      />
      <TooltipProvider>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {BIBLE_INSPIRATION_CATEGORY_CONFIG.map(category => (
            <InspirationCategory
              key={category.key}
              icon={INSPIRATION_CATEGORY_ICONS[category.key]}
              colorClass={category.colorClass}
              label={category.label}
              categoryKey={category.key}
              searchSuffix={category.searchSuffix}
              isEditing={isEditing}
              editValue={inspirationEditValue(localPlan.inspirations?.[category.key])}
              items={normalizedInspirations[category.key] ?? []}
              onChange={updateInspiration}
            />
          ))}
        </div>
      </TooltipProvider>
    </BibleSectionShell>
  )
}
