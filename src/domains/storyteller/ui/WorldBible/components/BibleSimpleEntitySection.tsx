import type { FC, ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { RichText } from '../../RichText'
import { BibleSectionHeader, BibleSectionShell } from './BibleSectionChrome'
import type { PendingAction } from '../utils/bible-context-types'

type NamedEntity = { name?: string; description?: string | null }

const EmptyState: FC<{ message: string }> = ({ message }) => (
  <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
    {message}
  </div>
)

const NamedEntityEditList: FC<{
  items: NamedEntity[]
  emptyMessage: string
  onUpdate: (index: number, field: 'name' | 'description', value: string) => void
  onRemove: (index: number) => void
}> = ({ items, emptyMessage, onUpdate, onRemove }) => {
  if (items.length === 0) return <EmptyState message={emptyMessage} />
  return (
    <div className="space-y-4">
      {items.map((item, idx) => (
        <div key={idx} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <input
              type="text"
              className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
              placeholder="Name..."
              value={item.name || ''}
              onChange={e => onUpdate(idx, 'name', e.target.value)}
            />
            <button
              onClick={() => onRemove(idx)}
              className="ml-2 p-1.5 text-red-400 hover:bg-red-400/20 rounded"
              title="Remove"
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <textarea
            className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-24"
            placeholder="Description..."
            value={item.description || ''}
            onChange={e => onUpdate(idx, 'description', e.target.value)}
          />
        </div>
      ))}
    </div>
  )
}

const NamedEntityDisplayGrid: FC<{
  items: NamedEntity[]
  emptyMessage: string
  projectId: string
  cardIcon: ReactNode
  cardIconWrapClassName: string
}> = ({ items, emptyMessage, projectId, cardIcon, cardIconWrapClassName }) => {
  if (items.length === 0) return <EmptyState message={emptyMessage} />
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item, idx) => {
        if (!item) return null
        return (
          <div
            key={idx}
            className="group cursor-default transition-all duration-300 border hover:border-primary/30 bg-card/40 backdrop-blur-sm p-5 rounded-xl flex flex-col gap-2"
          >
            <div className="flex items-center gap-3 mb-1">
              <div className={`p-2 rounded-lg shrink-0 ${cardIconWrapClassName}`}>{cardIcon}</div>
              <h4 className="font-syne font-bold text-[16px] text-foreground leading-tight">
                {item.name}
              </h4>
            </div>
            <div className="text-sm text-muted-foreground/80 leading-relaxed mt-2">
              <RichText text={item.description} projectId={projectId} inline />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export type BibleSimpleEntitySectionProps = {
  icon: ReactNode
  title: string
  loadingMessage: string
  spinnerClassName?: string
  emptyEditMessage: string
  emptyDisplayMessage: string
  generatePrompt: string
  generateTitle: string
  addTitle: string
  sectionKey: string
  cardIcon: ReactNode
  cardIconWrapClassName: string
  localItems: NamedEntity[]
  displayItems: NamedEntity[]
  isEditing: boolean
  isReadOnly: boolean
  isLoading: boolean
  pendingAction?: PendingAction
  onSendMessage?: (msg: string, section?: string) => void
  projectId: string
  onAdd: () => void
  onRemove: (index: number) => void
  onUpdate: (index: number, field: 'name' | 'description', value: string) => void
}

export const BibleSimpleEntitySection: FC<BibleSimpleEntitySectionProps> = ({
  icon,
  title,
  loadingMessage,
  spinnerClassName,
  emptyEditMessage,
  emptyDisplayMessage,
  generatePrompt,
  generateTitle,
  addTitle,
  sectionKey,
  cardIcon,
  cardIconWrapClassName,
  localItems,
  displayItems,
  isEditing,
  isReadOnly,
  isLoading,
  pendingAction,
  onSendMessage,
  projectId,
  onAdd,
  onRemove,
  onUpdate,
}) => (
  <BibleSectionShell
    isLoading={isLoading}
    loadingMessage={loadingMessage}
    spinnerClassName={spinnerClassName}
    pendingAction={pendingAction}
  >
    <BibleSectionHeader
      icon={icon}
      title={title}
      isEditing={isEditing}
      isReadOnly={isReadOnly}
      isLoading={isLoading}
      onAdd={onAdd}
      addTitle={addTitle}
      onGenerate={
        onSendMessage ? () => onSendMessage(generatePrompt, sectionKey) : undefined
      }
      generateTitle={generateTitle}
    />
    {isEditing ? (
      <NamedEntityEditList
        items={localItems}
        emptyMessage={emptyEditMessage}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    ) : (
      <NamedEntityDisplayGrid
        items={displayItems}
        emptyMessage={emptyDisplayMessage}
        projectId={projectId}
        cardIcon={cardIcon}
        cardIconWrapClassName={cardIconWrapClassName}
      />
    )}
  </BibleSectionShell>
)
