import React from 'react'
import { Globe, RefreshCw, Zap, Palette, Sparkles, Star } from 'lucide-react'
import { StoryPlan } from '../../schemas/agent-schemas'
import { IconButton } from '@/components/ui/icon-button'
import { StorytellerImage } from '../StorytellerImage'
import toast from 'react-hot-toast'
import { moodboardGenerationService } from '../../services/MoodboardGenerationService'

import { useBible } from './BibleContext'

interface BibleOverviewProps {
  isGenerating: boolean
  primaryImageIndex: number | null
  onSetPrimaryImage: (index: number) => void
  generatingIndices: Set<number>
  onRefetchMoodboardData: () => Promise<void>
}

export const BibleOverview: React.FC<BibleOverviewProps> = ({
  isGenerating,
  primaryImageIndex,
  onSetPrimaryImage,
  generatingIndices,
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
  } = useBible()
  return (
    <div className="space-y-8">
      {/* WORLD DESCRIPTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary/70" />
            <h3 className="font-syne font-bold text-lg">Overview</h3>
          </div>
          {!isReadOnly && onSendMessage && (
            <IconButton
              icon={<RefreshCw size={14} />}
              onClick={() =>
                onSendMessage(
                  'Generate a rich world description including setting, atmosphere, and key details.'
                )
              }
              tooltip="Generate World Description"
              size="sm"
            />
          )}
        </div>

        {/* High Level Meta Info (Title, Genre, Tone) */}
        {!isEditing &&
        (storyPlan.title || storyPlan.genre || storyPlan.tone || storyPlan.centralQuestion) ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* Title, Genre, Tone Card */}
            {(storyPlan.title || storyPlan.genre || storyPlan.tone) && (
              <div className="md:col-span-2 p-6 rounded-xl bg-muted/20 border border-border/50 flex flex-col justify-center">
                {storyPlan.title && (
                  <h1 className="text-3xl font-bold font-syne text-foreground mb-4 tracking-tight leading-tight">
                    {storyPlan.title}
                  </h1>
                )}
                <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-mono text-muted-foreground">
                  {storyPlan.genre && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                        Genre
                      </span>
                      <span className="font-medium text-foreground/80">{storyPlan.genre}</span>
                    </div>
                  )}
                  {storyPlan.tone && (
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
                        Tone
                      </span>
                      <span className="font-medium text-foreground/80 leading-snug max-w-md">
                        {storyPlan.tone}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Central Question Card */}
            {storyPlan.centralQuestion && (
              <div className="md:col-span-1 p-6 rounded-xl bg-muted/10 border border-border/40 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-3.5 h-3.5 text-muted-foreground/60" />
                  <div className="text-[10px] font-bold font-mono text-muted-foreground/60 uppercase tracking-widest">
                    Central Question
                  </div>
                </div>
                <div className="text-lg font-syne italic text-foreground/90 leading-snug">
                  "{storyPlan.centralQuestion}"
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className="w-full mt-8">
          {isEditing ? (
            <textarea
              className="w-full h-64 p-6 bg-background border border-border rounded-xl text-sm font-sans focus:ring-1 focus:ring-primary/30 outline-none resize-none shadow-sm"
              value={localPlan.worldDescription || ''}
              onChange={e => onChange('worldDescription', e.target.value)}
              placeholder="Describe the world..."
            />
          ) : (
            <div className="p-8 bg-muted/5 border border-border/20 rounded-2xl">
              <div className="max-w-4xl mx-auto text-foreground/80 text-[15px] leading-relaxed font-sans whitespace-pre-wrap">
                {storyPlan.worldDescription || (
                  <span className="text-muted-foreground italic">
                    No world description available.
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* MOODBOARD SECTION */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-400/80" />
            <h3 className="font-syne font-bold text-lg">Moodboard</h3>
          </div>
          {isEditing && (
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (isGenerating) return
                  if (!storyPlan.worldDescription) {
                    toast.error('Please add a world description first.')
                    return
                  }
                  if (!projectId) return
                  const config = getProviderConfig()
                  if (!config.apiKey) {
                    toast.error(
                      `Missing API key for ${config.provider}. Please configure in Settings.`
                    )
                    return
                  }
                  try {
                    await moodboardGenerationService.generate(
                      projectId,
                      [], // Prompts are generated on backend
                      undefined, // Style ref handled on backend
                      config,
                      onRefetchMoodboardData
                    )
                  } catch (e) {
                    console.error(e)
                    toast.error('Error starting generation')
                  }
                }}
                disabled={isGenerating}
                className={`p-1.5 rounded-md transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                title="Generate Moodboard"
              >
                <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>

        {storyPlan.moodImages && storyPlan.moodImages.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 mb-4">
            {storyPlan.moodImages.map((img, i) => {
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
                  emptyLabel={!isFile ? img : 'No Image'}
                  overlay={
                    !isReadOnly && (
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
                            if (isLoading) return
                            if (!projectId) return
                            const config = getProviderConfig()
                            if (!config.apiKey) {
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
                          disabled={isLoading}
                          className={`p-2 rounded-full text-white transition-colors ${isLoading ? 'bg-pink-500/50 cursor-not-allowed' : 'bg-pink-500/80 hover:bg-pink-500 backdrop-blur-md'}`}
                          title="Regenerate"
                        >
                          <Sparkles size={16} className={isLoading ? 'animate-spin' : ''} />
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
                </StorytellerImage>
              )
            })}
          </div>
        ) : (
          <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic mb-4">
            No mood visuals generated yet.
          </div>
        )}

        {/* Image Prompts Display */}
        {storyPlan.imagePrompts && (
          <div className="mt-4 p-3 bg-pink-500/5 border border-pink-500/10 rounded-lg">
            <h4 className="text-xs font-bold text-pink-400 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> Visual Direction (Prompts)
            </h4>
            <div className="space-y-2">
              {Object.entries(storyPlan.imagePrompts as Record<string, string>).map(
                ([key, prompt], i) => (
                  <div key={i} className="text-xs text-muted-foreground/80">
                    <span className="font-mono text-pink-300 mr-2 uppercase text-[10px]">
                      {key}:
                    </span>
                    <span className="italic">"{prompt}"</span>
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
