import type { FC, ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import { BibleEntityTile, BibleEntityTileClass } from '../../BibleEntityTile'
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
}> = ({ items, emptyMessage, projectId }) => {
  if (items.length === 0) return <EmptyState message={emptyMessage} />
  return (
    <div className={BibleEntityTileClass.Grid}>
      {items.map((item, idx) => {
        if (!item) return null
        return (
          <BibleEntityTile
            key={idx}
            projectId={projectId}
            title={item.name || ''}
            description={item.description}
          />
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
  generateTitle: string
  addTitle: string
  localItems: NamedEntity[]
  displayItems: NamedEntity[]
  isEditing: boolean
  isReadOnly: boolean
  isLoading: boolean
  pendingAction?: PendingAction
  onGenerate?: () => void
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
  generateTitle,
  addTitle,
  localItems,
  displayItems,
  isEditing,
  isReadOnly,
  isLoading,
  pendingAction,
  onGenerate,
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
      onGenerate={onGenerate}
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
      />
    )}
  </BibleSectionShell>
)
