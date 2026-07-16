import React, { useState, useEffect } from 'react'
import { Globe, RefreshCw, Zap, Palette, Sparkles, Star, Loader2, Trash2, Plus } from 'lucide-react'
import { IconButton } from '@/components/IconButton'
import { StorytellerImage } from '../../StorytellerImage'
import toast from 'react-hot-toast'
import { moodboardGenerationService } from '../../../services/moodboard-generation-service'
import { RichText } from '../../RichText'

import { useBible } from './bible-context'
import { SectionPendingOverlay } from './SectionPendingOverlay'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { useGlobalStatusStore } from '@/shared/jobs/useGlobalStatusStore'
import { MoodboardProvider } from '@/domains/storyteller/ui/WorldBible/constants/bible-overview'
import { settingsApi } from '@/domains/world-building-toolkit/core/io/settings.api'
import { patchStorytellerProject } from '@/domains/storyteller/core/io/storyteller.api'

interface BibleOverviewProps {
  primaryImageIndex: number | null
  onSetPrimaryImage: (index: number) => void
  onRefetchMoodboardData: () => Promise<void>
}

export const BibleOverview: React.FC<BibleOverviewProps> = ({
  primaryImageIndex,
  onSetPrimaryImage,
  onRefetchMoodboardData,
}) => {
  const {
    storyPlan,
    isEditing,
    localPlan,
    updateLocalPlan: onChange,
    isReadOnly,
    onSendMessage,
    projectId,
    getProviderConfig,
    loadingSections,
    pendingActions,
  } = useBible()

  // Derive generating state from global operations
  const operations = useGlobalStatusStore(state => state.operations)
  const generatingIndices = new Set<number>()
  const prefix = `moodboard-gen-${projectId}`

  // Find the active operation to get status details
  const activeOp = operations.find(op => op.id.startsWith(prefix))
  const progressDetails = activeOp?.details

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

  // Define general generating state
  const isGenerating = generatingIndices.size > 0

  // Determine if we are specifically adding a new image (index out of bounds of current array)
  // or generating the initial set (index 0,1,2,3 for empty)
  const displayMoodImages = isEditing
    ? (localPlan.moodImages || storyPlan.moodImages || [])
    : (localPlan.moodImages || storyPlan.moodImages || [])
  const isAddingNew = Array.from(generatingIndices).some(idx => {
    const currentCount = displayMoodImages.length || 0
    return idx >= currentCount
  })

  // Extract progress percentage from string if possible (e.g. "Generating (45%)")
  const progressMatch = progressDetails?.match(/(\d+)%/)
  const progressPercent = progressMatch ? progressMatch[1] : null

  const isWorldDescLoading = loadingSections?.worldDescription?.loading ?? false
  const pendingAction = pendingActions?.worldDescription
  const { confirm, ConfirmDialogComponent } = useConfirmDialog()

  // LegNext/Midjourney can be configured via env on server; avoid "Missing API key" when set there
  const [legnextFromServer, setLegnextFromServer] = useState(false)
  useEffect(() => {
    settingsApi
      .fetchProviders()
      .then(providers => {
        if (providers.legnext) setLegnextFromServer(true)
      })
      .catch(() => {})
  }, [])

  const hasMoodboardApiKey = (config: { provider: string; apiKey?: string }) =>
    config.apiKey || (config.provider === MoodboardProvider.Midjourney && legnextFromServer)

  return (
    <div className="space-y-8">
      {/* WORLD DESCRIPTION */}
      <section className={isWorldDescLoading || pendingAction ? 'relative' : ''}>
        {/* Pending action overlay */}
        {pendingAction && (
          <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
        )}
        {isWorldDescLoading && !pendingAction && (
          <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span>Painting your world...</span>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary/70" />
            <h3 className="font-syne font-bold text-lg">Overview</h3>
          </div>
          {!isReadOnly && onSendMessage && (
            <IconButton
              icon={<RefreshCw size={14} className={isWorldDescLoading ? 'animate-spin' : ''} />}
              onClick={() =>
                onSendMessage?.(
                  'Generate a completely BRAND NEW, rich world description including setting, atmosphere, and key details. IMPORTANT: Take a completely new creative direction and do NOT repeat previous content.',
                  'worldDescription'
                )
              }
              disabled={isWorldDescLoading}
              tooltip="Generate World Description"
              size="sm"
            />
          )}
        </div>

        {/* High Level Meta Info (Title, Genre, Tone) */}
        {!isEditing &&
          ((localPlan.title || storyPlan.title) || (localPlan.genre || storyPlan.genre) || (localPlan.tone || storyPlan.tone) || (localPlan.centralQuestion || storyPlan.centralQuestion)) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Title, Genre, Tone Card — full width */}
            {((localPlan.title || storyPlan.title) || (localPlan.genre || storyPlan.genre) || (localPlan.tone || storyPlan.tone)) && (
              <div className="md:col-span-3 p-6 rounded-xl bg-muted/20 border border-border/50 flex flex-col justify-center">
                {(localPlan.title || storyPlan.title) && (
                  <h1 className="text-3xl font-bold font-syne text-foreground mb-4 tracking-tight leading-tight">
                    {localPlan.title || storyPlan.title}
                  </h1>
                )}
                <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-mono text-muted-foreground">
                  {(localPlan.genre || storyPlan.genre) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                        Genre
                      </span>
                      <span className="font-medium text-foreground/80">{localPlan.genre || storyPlan.genre}</span>
                    </div>
                  )}
                  {(localPlan.tone || storyPlan.tone) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                        Tone
                      </span>
                      <span className="font-medium text-foreground/80 leading-snug max-w-md">
                        {localPlan.tone || storyPlan.tone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Central Question Card */}
            {(localPlan.centralQuestion || storyPlan.centralQuestion) && (
              <div className="md:col-span-1 p-6 rounded-xl bg-muted/10 border border-border/40 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <div className="text-[10px] font-bold font-mono text-muted-foreground/60 uppercase tracking-widest">
                    Central Question
                  </div>
                </div>
                <div className="text-lg font-syne italic text-foreground/90 leading-snug">
                  "{localPlan.centralQuestion || storyPlan.centralQuestion}"
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Executive Summary */}
        {!isEditing && (localPlan.executiveSummary || storyPlan.executiveSummary) && (
          <div className="mb-8 p-6 rounded-xl bg-orange-500/5 border border-orange-500/10">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-orange-400" />
              <h4 className="font-bold text-sm uppercase tracking-wider text-orange-400">
                Executive Summary
              </h4>
            </div>
            <p className="text-lg font-medium text-foreground/90 leading-relaxed font-syne">
              {localPlan.executiveSummary || storyPlan.executiveSummary}
            </p>
          </div>
        )}

        <div className="w-full mt-8">
          {isEditing ? (
            <textarea
              className="w-full h-64 p-6 bg-background border border-border rounded-xl text-sm font-sans focus:ring-1 focus:ring-primary/30 outline-none resize-none shadow-sm"
              value={localPlan.worldDescription || ''}
              onChange={e => onChange({ worldDescription: e.target.value })}
              placeholder="Describe the world..."
            />
          ) : (
            <div className="p-8 bg-muted/5 border border-border/20 rounded-2xl">
              <div className="max-w-4xl mx-auto text-foreground/80 text-[15px] leading-relaxed font-sans">
                <RichText
                  text={localPlan.worldDescription || storyPlan.worldDescription}
                  projectId={projectId}
                  showPlaceholder
                  placeholder="No world description available."
                />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MOODBOARD SECTION */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-400/80" />
            <h3 className="font-syne font-bold text-lg">Moodboard</h3>
          </div>
          {!isReadOnly && isGenerating && (
            <div className="flex items-center gap-2 text-sm text-pink-500 font-medium">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{progressDetails || 'Processing visuals...'}</span>
            </div>
          )}
        </div>
        {!isReadOnly && isGenerating && (
          <div className="mb-4">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-pink-500/80 transition-all duration-500 ease-out"
                style={{ width: `${progressPercent ? Math.min(100, Math.max(0, Number(progressPercent))) : 5}%` }}
              />
            </div>
          </div>
        )}

        {displayMoodImages && displayMoodImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {displayMoodImages.map((img, i) => {
              if (typeof img !== 'string') return null
              const isPrimary = primaryImageIndex === i
              const isFile = img.match(/\.(png|jpg|jpeg|webp)$/i) || img.startsWith('http')
              const imageUrl = isFile
                ? img.startsWith('http')
                  ? img
                  : `/projects/${projectId}/${img}`
                : null

              const isLoading = generatingIndices.has(i)

              return (
                <StorytellerImage
                  key={i}
                  src={imageUrl}
                  alt={`Mood ${i + 1}`}
                  isLoading={isLoading}
                  isPrimary={isPrimary}
                  className="group relative"
                  emptyLabel={
                    isLoading
                      ? progressPercent
                        ? `${progressPercent}%`
                        : 'Generating...'
                      : 'No Image'
                  }
                  overlay={
                    !isReadOnly &&
                    !isLoading && (
                      <div className="flex gap-2">
                        {/* Set as Primary Button */}
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            onSetPrimaryImage(i)
                          }}
                          className={`p-2 rounded-full transition-colors ${isPrimary ? 'bg-yellow-400 text-black' : 'bg-white/20 hover:bg-yellow-400 text-white hover:text-black backdrop-blur-md'}`}
                          title={isPrimary ? 'Remove as primary' : 'Set as primary background'}
                        >
                          <Star size={16} className={isPrimary ? 'fill-current' : ''} />
                        </button>
                        {/* Regenerate Button */}
                        <button
                          onClick={async e => {
                            e.stopPropagation()
                            if (isGenerating) return // Prevent multiple concurrent generations for now to stay safe
                            if (!projectId) return
                            const config = getProviderConfig()
                            if (!hasMoodboardApiKey(config)) {
                              toast.error(
                                `Missing API key for ${config.provider}. Please configure in Settings.`
                              )
                              return
                            }
                            try {
                              await moodboardGenerationService.generate(
                                projectId,
                                [],
                                undefined,
                                config,
                                onRefetchMoodboardData,
                                i // promptIndex for single image regeneration
                              )
                            } catch (err) {
                              console.error(err)
                              toast.error('Error starting regeneration')
                            }
                          }}
                          disabled={isGenerating}
                          className={`p-2 rounded-full text-white transition-colors ${isGenerating ? 'bg-pink-500/50 cursor-not-allowed' : 'bg-pink-500/80 hover:bg-pink-500 backdrop-blur-md'}`}
                          title="Regenerate"
                        >
                          <Sparkles size={16} />
                        </button>
                        {/* Remove Button */}
                        <button
                          onClick={async e => {
                            e.stopPropagation()
                            if (isGenerating) return
                            if (!projectId) return

                            // Use custom UI dialog
                            const confirmed = await confirm({
                              title: 'Delete Image',
                              description:
                                'Are you sure you want to remove this moodboard image? This cannot be undone.',
                              confirmLabel: 'Delete',
                              variant: 'destructive',
                            })
                            if (!confirmed) return

                            try {
                              const updatedImages = [...displayMoodImages].filter(
                                (_, idx) => idx !== i
                              )
                              await patchStorytellerProject(projectId, {
                                seriesBible: { moodImages: updatedImages },
                              })
                              await onRefetchMoodboardData()
                              toast.success('Image removed')
                            } catch (err) {
                              console.error(err)
                              toast.error('Error removing image')
                            }
                          }}
                          disabled={isGenerating}
                          className={`p-2 rounded-full text-white transition-all shadow-md ${isGenerating
                            ? 'bg-red-500/30 cursor-not-allowed'
                            : 'bg-red-500/80 hover:bg-red-500 hover:scale-110 active:scale-95 backdrop-blur-md'
                            }`}
                          title="Remove"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )
                  }
                >
                  {/* Primary indicator (always visible if primary) */}
                  {isPrimary && (
                    <div className="absolute top-1 left-1 z-20">
                      <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 drop-shadow-md" />
                    </div>
                  )}
                  {/* Loading indicator with progress */}
                  {isLoading && (
                    <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex flex-col items-center justify-center z-30">
                      <Loader2 className="w-8 h-8 text-pink-500 animate-spin mb-2" />
                      <span className="text-xs font-bold text-pink-500">
                        {progressPercent ? `${progressPercent}%` : 'Generating...'}
                      </span>
                    </div>
                  )}
                </StorytellerImage>
              )
            })}
            {/* Add New Image Button */}
            {!isReadOnly && (
              <button
                onClick={async () => {
                  if (isGenerating) return
                  if (!projectId) return
                  const config = getProviderConfig()
                  if (!hasMoodboardApiKey(config)) {
                    toast.error(
                      `Missing API key for ${config.provider}. Please configure in Settings.`
                    )
                    return
                  }
                  try {
                    // Generate a new image at the next index
                    const nextIndex = displayMoodImages.length || 0
                    await moodboardGenerationService.generate(
                      projectId,
                      [],
                      undefined,
                      config,
                      onRefetchMoodboardData,
                      nextIndex
                    )
                    toast.success('Generating new moodboard image...')
                  } catch (err) {
                    console.error(err)
                    toast.error('Error starting generation')
                  }
                }}
                disabled={isGenerating}
                className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 transition-all ${isGenerating
                  ? 'border-muted-foreground/20 bg-muted/5 cursor-not-allowed opacity-50'
                  : 'border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60 hover:bg-pink-500/10 cursor-pointer'
                  }`}
                title="Add new moodboard image"
              >
                <Plus
                  className={`w-8 h-8 ${isAddingNew ? 'text-muted-foreground/30 hidden' : 'text-pink-500/60'}`}
                />
                {isAddingNew ? (
                  <div className="flex flex-col items-center gap-2 animate-pulse">
                    <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                    <span className="text-[10px] text-pink-400 font-medium">
                      {progressPercent ? `${progressPercent}%` : 'Generating...'}
                    </span>
                  </div>
                ) : (
                  <span
                    className={`text-xs ${isGenerating ? 'text-muted-foreground/30' : 'text-pink-500/60'}`}
                  >
                    Add Image
                  </span>
                )}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
              No mood visuals generated yet.
            </div>
            {/* Add First Image Button when empty */}
            {!isReadOnly && (
              <button
                onClick={async () => {
                  if (isGenerating) return
                  if (!(localPlan.worldDescription || storyPlan.worldDescription)) {
                    toast.error('Please add a world description first.')
                    return
                  }
                  if (!projectId) return
                  const config = getProviderConfig()
                  if (!hasMoodboardApiKey(config)) {
                    toast.error(
                      `Missing API key for ${config.provider}. Please configure in Settings.`
                    )
                    return
                  }
                  try {
                    await moodboardGenerationService.generate(
                      projectId,
                      [],
                      undefined,
                      config,
                      onRefetchMoodboardData
                    )
                    toast.success('Generating moodboard images...')
                  } catch (err) {
                    console.error(err)
                    toast.error('Error starting generation')
                  }
                }}
                disabled={isGenerating}
                className={`w-full p-4 rounded-xl border-2 border-dashed flex items-center justify-center gap-3 transition-all ${isGenerating
                  ? 'border-muted-foreground/20 bg-muted/5 cursor-not-allowed opacity-50'
                  : 'border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60 hover:bg-pink-500/10 cursor-pointer'
                  }`}
              >
                {isAddingNew || isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 text-pink-500 animate-spin" />
                    <span className="text-sm text-pink-500">
                      {progressPercent ? `Generating (${progressPercent}%)` : 'Generating...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-pink-500/60" />
                    <span className="text-sm text-pink-500/80">
                      Generate Moodboard with Midjourney
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </section>
      {/* Confirm Dialog */}
      {ConfirmDialogComponent}
    </div>
  )
}
