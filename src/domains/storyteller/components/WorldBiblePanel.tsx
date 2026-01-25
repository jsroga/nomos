import {
  Save,
  Edit2,
  X,
  Lock,
  Unlock,
  Shield,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useState, useEffect, useCallback } from 'react'
import { LocalStorageKeys } from '@/constants/localStorage'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { moodboardGenerationService } from '../services/MoodboardGenerationService'
import toast from 'react-hot-toast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { isCentralUser, canEditBible } from '@/lib/bible-permissions'

import {
  StoryPlan,
  WorldRule,
  Faction,
  KeyCharacter,
  StorySequence,
} from '../schemas/agent-schemas'
import { CharacterCreationDialog } from './CharacterCreationDialog'

import { BibleOverview } from './WorldBible/BibleOverview'
import { BibleSoundtracks } from './WorldBible/BibleSoundtracks'
import { BibleInspirations } from './WorldBible/BibleInspirations'
import { BibleWorldLogic } from './WorldBible/BibleWorldLogic'
import { BibleFactions } from './WorldBible/BibleFactions'
import { BibleCharacters } from './WorldBible/BibleCharacters'
import { BibleRoadmap } from './WorldBible/BibleRoadmap'
import { BibleProvider, useBible } from './WorldBible/BibleContext'

// Helper to get provider config from localStorage
const getProviderConfig = () => {
  const provider = localStorage.getItem('MOODBOARD_PROVIDER') || 'midjourney'

  // Get Gemini API key (for Nano Banana)
  const geminiConfigStr = localStorage.getItem(LocalStorageKeys.AI_CONFIG_GEMINI)
  let geminiKey = ''
  try {
    if (geminiConfigStr) {
      const parsed = JSON.parse(geminiConfigStr)
      geminiKey = parsed.apiKey || ''
    }
  } catch {
    geminiKey = geminiConfigStr || ''
  }

  // Get LegNext key (for Midjourney)
  const legnextConfigStr = localStorage.getItem(LocalStorageKeys.AI_CONFIG_LEGNEXT)
  let legnextKey = ''
  try {
    legnextKey = legnextConfigStr ? JSON.parse(legnextConfigStr).apiKey : ''
  } catch {
    legnextKey = legnextConfigStr || ''
  }

  if (provider === 'nanobanana') {
    return {
      provider: 'nanobanana' as const,
      apiKey: geminiKey,
      modelId: localStorage.getItem('NANO_BANANA_MODEL_ID') || 'flux-pro',
    }
  } else {
    // Default to midjourney
    return {
      provider: 'midjourney' as const,
      apiKey: legnextKey,
      modelId: 'midjourney',
    }
  }
}

interface WorldBiblePanelProps {
  storyPlan: StoryPlan
  onUpdate?: (updates: Partial<StoryPlan>) => void
  isReadOnly?: boolean
  onSendMessage?: (msg: string) => void
  projectId?: string
  onConvertToCast?: (character: KeyCharacter) => void
  onClose?: () => void
  isLoading?: boolean
}

export const WorldBiblePanel: React.FC<WorldBiblePanelProps> = props => {
  const projectId =
    props.projectId ||
    (typeof window !== 'undefined'
      ? window.location.pathname.startsWith('/app/')
        ? window.location.pathname.split('/')[2]
        : window.location.pathname.split('/')[1]
      : '')

  return (
    <BibleProvider {...props} projectId={projectId} getProviderConfig={getProviderConfig}>
      <WorldBiblePanelContent {...props} projectId={projectId} />
    </BibleProvider>
  )
}

const WorldBiblePanelContent: React.FC<WorldBiblePanelProps> = ({
  storyPlan,
  onUpdate,
  isReadOnly = false,
  onSendMessage,
  projectId,
  onConvertToCast,
  onClose,
  isLoading,
}) => {
  // All hooks must come before any conditional returns
  const {
    localPlan,
    isEditing,
    setIsEditing,
    savePlan,
    cancelEdit,
    toggleLock,
    updateLocalPlan,
    isLocked: isBibleLocked,
    lockedBy,
    lockedAt,
    userEmail,
    isLockLoading,
    isReadOnly: effectiveReadOnly,
    updateWorldRule,
    addWorldRule,
    removeWorldRule,
    updateFaction,
    addFaction,
    removeFaction,
    updateKeyCharacter,
    addKeyCharacter,
    removeKeyCharacter,
    updateSequence,
    addSequence,
    removeSequence,
    updatePlotTwist,
    addPlotTwist,
    removePlotTwist,
    updateInspiration,
  } = useBible()

  const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(null)
  const [convertDialogOpen, setConvertDialogOpen] = useState(false)
  const [convertingCharacter, setConvertingCharacter] = useState<KeyCharacter | null>(null)
  const [dialogMode, setDialogMode] = useState<'convert' | 'create'>('convert')

  const isUserCentralUser = isCentralUser(userEmail)
  const canUserEditBible = canEditBible(userEmail, isBibleLocked)

  // Derive generating state from global operations
  const operations = useGlobalStatusStore(state => state.operations)
  const generatingIndices = new Set<number>()
  const prefix = `moodboard-gen-${projectId}`

  operations.forEach(op => {
    if (op.id === prefix) {
      generatingIndices.add(0)
      generatingIndices.add(1)
      generatingIndices.add(2)
      generatingIndices.add(3)
    } else if (op.id.startsWith(prefix + '-')) {
      const idx = parseInt(op.id.replace(prefix + '-', ''))
      if (!isNaN(idx)) generatingIndices.add(idx)
    }
  })

  const isGenerating = generatingIndices.size > 0

  // Refetch project data
  const refetchMoodboardData = useCallback(async () => {
    if (!projectId) return
    try {
      const response = await fetch(`/api/storyteller/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        const bible = data.seriesBible || data.series_bible
        if (bible?.moodImages && onUpdate) {
          onUpdate({ moodImages: bible.moodImages })
        }
      }
    } catch (error) {
      console.error('Failed to refetch moodboard data:', error)
    }
  }, [projectId, onUpdate])

  useEffect(() => {
    const handler = (event: CustomEvent) => {
      if (event.detail?.projectId === projectId) refetchMoodboardData()
    }
    window.addEventListener('moodboard-generation-complete', handler as EventListener)
    return () =>
      window.removeEventListener('moodboard-generation-complete', handler as EventListener)
  }, [projectId, refetchMoodboardData])

  // Shimmer State - check after all hooks
  if (isLoading) {
    return (
      <div className="h-full flex flex-col relative animate-pulse">
        {/* Header Shimmer */}
        <div
          className="bg-background/80 border-b border-border/40 pb-[10px] flex items-center justify-between rounded-lg"
          style={{
            marginLeft: -25,
            marginRight: -25,
            paddingLeft: 25,
            paddingRight: 25,
            paddingTop: 10,
          }}
        >
          <div className="h-7 w-32 bg-muted/40 rounded"></div>
          <div className="flex gap-2">
            <div className="h-8 w-8 bg-muted/40 rounded"></div>
            <div className="h-8 w-16 bg-muted/40 rounded"></div>
          </div>
        </div>

        {/* Content Shimmer */}
        <div className="flex-1 overflow-y-auto pr-2 pt-6 space-y-8">
          {/* Overview Section */}
          <div className="space-y-4">
            <div className="h-6 w-40 bg-muted/40 rounded"></div>
            <div className="grid grid-cols-4 gap-4 h-48">
              <div className="col-span-1 bg-muted/20 rounded-lg"></div>
              <div className="col-span-3 bg-muted/10 rounded-lg"></div>
            </div>
          </div>
          {/* Other sections */}
          <div className="space-y-4">
            <div className="h-6 w-32 bg-muted/40 rounded"></div>
            <div className="h-32 bg-muted/10 rounded-lg"></div>
          </div>
          <div className="space-y-4">
            <div className="h-6 w-32 bg-muted/40 rounded"></div>
            <div className="h-32 bg-muted/10 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  // Save primary image selection
  const handleSetPrimaryImage = (index: number) => {
    const newIndex = primaryImageIndex === index ? null : index
    setPrimaryImageIndex(newIndex)
    if (typeof window !== 'undefined' && projectId) {
      if (newIndex !== null)
        localStorage.setItem(`moodboard-primary-${projectId}`, newIndex.toString())
      else localStorage.removeItem(`moodboard-primary-${projectId}`)
      window.dispatchEvent(new CustomEvent('moodboard-primary-changed'))
    }
  }

  // Convert to Cast handlers
  const handleOpenConvertDialog = (char: KeyCharacter) => {
    setConvertingCharacter(char)
    setDialogMode('convert')
    setConvertDialogOpen(true)
  }

  const handleOpenCreateDialog = () => {
    setConvertingCharacter(null)
    setDialogMode('create')
    setConvertDialogOpen(true)
  }

  const handleCloseConvertDialog = () => {
    setConvertDialogOpen(false)
    setConvertingCharacter(null)
  }

  const handleDialogSubmit = (data: any) => {
    if (dialogMode === 'convert') {
      // Data from dialog is the NEW character data (might have edits)
      // But onConvertToCast might expect KeyCharacter or Character?
      // For now pass the data as it comes
      if (onConvertToCast) onConvertToCast(data)
    } else {
      // Create new Key Character in Bible
      addKeyCharacter({
        name: data.name,
        role: data.role,
        archetype: data.mbti ? `${data.mbti} ${data.role}` : data.role,
        motivation: data.description ? data.description.substring(0, 200) : 'No motivation set',
      })
    }
    handleCloseConvertDialog()
  }

  const convertInitialData = convertingCharacter
    ? {
        name: convertingCharacter.name,
        description: [
          convertingCharacter.archetype && `Archetype: ${convertingCharacter.archetype}`,
          convertingCharacter.motivation && `Motivation: ${convertingCharacter.motivation}`,
        ]
          .filter(Boolean)
          .join('. '),
        role: convertingCharacter.role,
      }
    : undefined

  return (
    <div className="h-full relative flex flex-col">
      <div
        className="bg-background/80 backdrop-blur-xl border-b border-border/40 pb-[10px] flex items-center justify-between rounded-lg"
        style={{
          marginLeft: -25,
          marginRight: -25,
          paddingLeft: 25,
          paddingRight: 25,
          paddingTop: 10,
        }}
      >
        <div>
          <h2 className="text-xl font-bold font-syne text-primary">World Bible</h2>
        </div>
        <div className="flex gap-2 items-center">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={isUserCentralUser ? toggleLock : undefined}
                  disabled={isLockLoading || !isUserCentralUser}
                  className={cn(
                    'gap-2 h-8 border transition-colors',
                    isBibleLocked
                      ? 'border-amber-500/50 text-amber-500'
                      : 'border-muted-foreground/30 text-muted-foreground',
                    isUserCentralUser &&
                      isBibleLocked &&
                      'hover:bg-amber-500/10 hover:border-amber-500',
                    isUserCentralUser &&
                      !isBibleLocked &&
                      'hover:bg-muted/50 hover:border-muted-foreground/50',
                    !isUserCentralUser && 'cursor-default opacity-70'
                  )}
                >
                  {isLockLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isBibleLocked ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    <Unlock className="w-4 h-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[250px]">
                <p className="text-sm font-medium">
                  {isBibleLocked ? '🔒 Bible is locked' : '🔓 Bible is unlocked'}
                </p>
                {isBibleLocked && lockedBy && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Locked by <span className="font-medium text-amber-400">{lockedBy}</span>
                  </p>
                )}
                {isBibleLocked && lockedAt && (
                  <p className="text-xs text-muted-foreground">
                    {lockedAt.toLocaleDateString()} at{' '}
                    {lockedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                {isUserCentralUser && (
                  <p className="text-xs text-amber-400 mt-2">
                    Click to {isBibleLocked ? 'unlock' : 'lock'}
                  </p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {!effectiveReadOnly && onUpdate && canUserEditBible && !isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              className="gap-2 h-8 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span className="text-xs">Edit</span>
            </Button>
          )}

          {!effectiveReadOnly && onUpdate && canUserEditBible && isEditing && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEdit}
                className="gap-2 h-8 border-muted-foreground/30 text-muted-foreground hover:bg-muted/50 hover:border-muted-foreground/50 transition-colors"
              >
                <X className="w-4 h-4" />
                <span className="text-xs">Cancel</span>
              </Button>
              <Button
                onClick={savePlan}
                size="sm"
                className="gap-2 h-8 border border-emerald-500/50 text-emerald-500 hover:bg-emerald-500/10 hover:border-emerald-500 transition-colors bg-transparent"
              >
                <Save className="w-4 h-4" />
                <span className="text-xs">Save</span>
              </Button>
            </>
          )}

          {isBibleLocked && !canUserEditBible && !isUserCentralUser && (
            <TooltipProvider delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 px-3 py-1 bg-muted/20 border border-amber-500/30 rounded-md cursor-help">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs text-amber-500 font-medium tracking-tight">
                      Read Only
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs font-medium tracking-tight">
                    🔒 Bible is locked (Admin Only)
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 pt-6">
        <div className="space-y-8 pb-20">
          <BibleOverview
            isGenerating={isGenerating}
            primaryImageIndex={primaryImageIndex}
            onSetPrimaryImage={handleSetPrimaryImage}
            generatingIndices={generatingIndices}
            onRefetchMoodboardData={refetchMoodboardData}
          />

          <BibleSoundtracks />

          <BibleInspirations />

          <BibleWorldLogic />

          <BibleFactions />

          <BibleRoadmap />

          <BibleCharacters
            onOpenConvertDialog={handleOpenConvertDialog}
            onOpenCreateDialog={handleOpenCreateDialog}
          />
        </div>
      </div>

      <CharacterCreationDialog
        isOpen={convertDialogOpen}
        onClose={handleCloseConvertDialog}
        onCreate={handleDialogSubmit}
        initialData={convertInitialData}
        mode={dialogMode === 'convert' ? 'create' : 'create'} // Both use create mode UI
      />
    </div>
  )
}
