import { Save, Edit2, X, Lock, Unlock, Shield, Loader2, Network, BookOpen } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/Tooltip'
import { Button } from '@/components/Button'
import { cn } from '@/shared/data/utils'
import { StorytellerBibleTab, WorldBiblePanelLockButtonClass, WorldBiblePanelUiCopy } from './constants/world-bible-panel'
import { toggledBibleTab } from './utils/toggled-bible-tab'

const headerChromeStyle = {
  marginLeft: -25,
  marginRight: -25,
  paddingLeft: 25,
  paddingRight: 25,
} as const

export interface WorldBiblePanelHeaderProps {
  activeTab: StorytellerBibleTab
  onSwitchTab: (tab: StorytellerBibleTab) => void
  isUserCentralUser: boolean
  isBibleLocked: boolean
  lockedBy?: string | null
  lockedAt?: Date | null
  isLockLoading: boolean
  onToggleLock: () => void
  effectiveReadOnly: boolean
  canUserEditBible: boolean
  isEditing: boolean
  onStartEditing: () => void
  onCancelEdit: () => void
  onSavePlan: () => void
  hasOnUpdate: boolean
}

export function WorldBiblePanelHeader({
  activeTab,
  onSwitchTab,
  isUserCentralUser,
  isBibleLocked,
  lockedBy,
  lockedAt,
  isLockLoading,
  onToggleLock,
  effectiveReadOnly,
  canUserEditBible,
  isEditing,
  onStartEditing,
  onCancelEdit,
  onSavePlan,
  hasOnUpdate,
}: WorldBiblePanelHeaderProps) {
  return (
    <div
      className="bg-background/80 backdrop-blur-xl border-b border-border/40 h-[60px] flex items-center justify-between rounded-lg"
      style={headerChromeStyle}
    >
      <div className="flex items-center gap-4">
        <h2 className="text-xl font-bold font-syne text-primary">
          {WorldBiblePanelUiCopy.StorybibleTitle}
        </h2>

        <div className="flex gap-1 p-1 bg-muted/30 rounded-lg">
          <button
            onClick={() => onSwitchTab(StorytellerBibleTab.Content)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === StorytellerBibleTab.Content
                ? 'bg-primary/20 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <BookOpen className="w-3.5 h-3.5" />
            {WorldBiblePanelUiCopy.ContentTab}
          </button>
          <button
            type="button"
            onClick={() => onSwitchTab(toggledBibleTab(activeTab))}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              activeTab === StorytellerBibleTab.Relationships
                ? 'bg-purple-500/20 text-purple-400'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            )}
          >
            <Network className="w-3.5 h-3.5" />
            {WorldBiblePanelUiCopy.RelationshipsTab}
          </button>
        </div>
      </div>

      <div className="flex gap-2 items-center">
        <WorldBiblePanelLockControl
          isUserCentralUser={isUserCentralUser}
          isBibleLocked={isBibleLocked}
          lockedBy={lockedBy}
          lockedAt={lockedAt}
          isLockLoading={isLockLoading}
          onToggleLock={onToggleLock}
        />

        <WorldBiblePanelEditControls
          effectiveReadOnly={effectiveReadOnly}
          canUserEditBible={canUserEditBible}
          isEditing={isEditing}
          activeTab={activeTab}
          hasOnUpdate={hasOnUpdate}
          onStartEditing={onStartEditing}
          onCancelEdit={onCancelEdit}
          onSavePlan={onSavePlan}
        />

        {isBibleLocked && !canUserEditBible && !isUserCentralUser && (
          <WorldBiblePanelReadOnlyBadge />
        )}
      </div>
    </div>
  )
}

interface WorldBiblePanelLockControlProps {
  isUserCentralUser: boolean
  isBibleLocked: boolean
  lockedBy?: string | null
  lockedAt?: Date | null
  isLockLoading: boolean
  onToggleLock: () => void
}

function lockButtonClassName(isUserCentralUser: boolean, isBibleLocked: boolean) {
  return cn(
    WorldBiblePanelLockButtonClass.Base,
    isBibleLocked ? WorldBiblePanelLockButtonClass.Locked : WorldBiblePanelLockButtonClass.Unlocked,
    isUserCentralUser &&
      isBibleLocked &&
      WorldBiblePanelLockButtonClass.LockedHover,
    isUserCentralUser &&
      !isBibleLocked &&
      WorldBiblePanelLockButtonClass.UnlockedHover,
    !isUserCentralUser && WorldBiblePanelLockButtonClass.DisabledCursor
  )
}

function LockButtonIcon({
  isLockLoading,
  isBibleLocked,
}: Pick<WorldBiblePanelLockControlProps, 'isLockLoading' | 'isBibleLocked'>) {
  if (isLockLoading) {
    return <Loader2 className="w-4 h-4 animate-spin" />
  }
  if (isBibleLocked) {
    return <Lock className="w-4 h-4" />
  }
  return <Unlock className="w-4 h-4" />
}

function LockTooltipContent({
  isBibleLocked,
  lockedBy,
  lockedAt,
  isUserCentralUser,
}: Pick<
  WorldBiblePanelLockControlProps,
  'isBibleLocked' | 'lockedBy' | 'lockedAt' | 'isUserCentralUser'
>) {
  return (
    <>
      <p className="text-sm font-medium text-white">
        {isBibleLocked ? '🔒 Storybible is locked' : '🔓 Storybible is unlocked'}
      </p>
      {isBibleLocked && lockedBy && (
        <p className="text-xs text-zinc-300 mt-1">
          Locked by <span className="font-medium text-amber-300">{lockedBy}</span>
        </p>
      )}
      {isBibleLocked && lockedAt && (
        <p className="text-xs text-zinc-300">
          {lockedAt.toLocaleDateString()} at{' '}
          {lockedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
      {isUserCentralUser && (
        <p className="text-xs text-amber-300 mt-2">Click to {isBibleLocked ? 'unlock' : 'lock'}</p>
      )}
    </>
  )
}

function WorldBiblePanelLockControl({
  isUserCentralUser,
  isBibleLocked,
  lockedBy,
  lockedAt,
  isLockLoading,
  onToggleLock,
}: WorldBiblePanelLockControlProps) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={isUserCentralUser ? onToggleLock : undefined}
            disabled={isLockLoading || !isUserCentralUser}
            className={lockButtonClassName(isUserCentralUser, isBibleLocked)}
          >
            <LockButtonIcon isLockLoading={isLockLoading} isBibleLocked={isBibleLocked} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[250px]">
          <LockTooltipContent
            isBibleLocked={isBibleLocked}
            lockedBy={lockedBy}
            lockedAt={lockedAt}
            isUserCentralUser={isUserCentralUser}
          />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

interface WorldBiblePanelEditControlsProps {
  effectiveReadOnly: boolean
  canUserEditBible: boolean
  isEditing: boolean
  activeTab: StorytellerBibleTab
  hasOnUpdate: boolean
  onStartEditing: () => void
  onCancelEdit: () => void
  onSavePlan: () => void
}

function WorldBiblePanelEditControls({
  effectiveReadOnly,
  canUserEditBible,
  isEditing,
  activeTab,
  hasOnUpdate,
  onStartEditing,
  onCancelEdit,
  onSavePlan,
}: WorldBiblePanelEditControlsProps) {
  if (effectiveReadOnly || !hasOnUpdate || !canUserEditBible) {
    return null
  }

  if (!isEditing && activeTab === StorytellerBibleTab.Content) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onStartEditing}
        className="gap-2 h-8 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors"
      >
        <Edit2 className="w-4 h-4" />
        <span className="text-xs">Edit</span>
      </Button>
    )
  }

  if (!isEditing) {
    return null
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancelEdit}
        className="gap-2 h-8 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors"
      >
        <X className="w-4 h-4" />
        <span className="text-xs">Cancel</span>
      </Button>
      <Button
        onClick={onSavePlan}
        size="sm"
        className="gap-2 h-8 border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors bg-transparent"
      >
        <Save className="w-4 h-4" />
        <span className="text-xs">Save</span>
      </Button>
    </>
  )
}

function WorldBiblePanelReadOnlyBadge() {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 border border-amber-500/30 rounded-md cursor-help">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs text-amber-500 font-medium tracking-tight">Read Only</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs font-medium tracking-tight">🔒 Storybible is locked (Admin Only)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
