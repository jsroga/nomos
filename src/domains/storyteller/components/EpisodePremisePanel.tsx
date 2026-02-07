import React, { useState } from 'react'
import {
  Sparkles,
  Book,
  Edit2,
  Save,
  Target,
  Zap,
  Skull,
  TrendingUp,
  Anchor,
  RefreshCw,
  Loader2,
} from 'lucide-react'
import { EpisodePremise, StoryPlan, Faction, WorldRule } from '../schemas/agent-schemas'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StorytellerImage } from './StorytellerImage'
import { ImageVariantSelector } from './ImageVariantSelector'
import { cn } from '@/lib/utils'

interface EpisodePremisePanelProps {
  premise: EpisodePremise | null
  globalBible: Partial<StoryPlan> // Read-only context
  posterUrl?: string | null
  posterPrompt?: string | null
  onUpdate: (updates: EpisodePremise) => void
  onGenerate: () => void
  onGeneratePoster?: () => void
  onGenerateStoryboard?: () => void
  onGenerateSection?: (
    section: 'protagonistHook' | 'fatalFlaw' | 'stakes' | 'inevitableConsequence' | 'logline'
  ) => void
  isGenerating?: boolean
  isGeneratingPoster?: boolean
  isGeneratingStoryboard?: boolean
  projectId: string
  episodeId?: string
  storyboardUrl?: string | null
  generatingSection?: string | null
}

export const EpisodePremisePanel: React.FC<EpisodePremisePanelProps> = ({
  premise,
  globalBible,
  posterUrl,
  posterPrompt,
  onUpdate,
  onGenerate,
  onGeneratePoster,
  onGenerateStoryboard,
  onGenerateSection,
  isGenerating = false,
  isGeneratingPoster = false,
  isGeneratingStoryboard = false,
  projectId,
  episodeId,
  storyboardUrl,
  generatingSection = null,
}) => {
  const [showBibleContext, setShowBibleContext] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  // Extend type to allow poster field for optimistic updates
  const [localPremise, setLocalPremise] = useState<Partial<EpisodePremise> & { poster?: string }>(
    premise || {}
  )

  // Variant Selection State
  const [showVariantPicker, setShowVariantPicker] = useState(false)
  const [gridImageUrl, setGridImageUrl] = useState<string | null>(null)

  // Sync local state if props change (and not editing)
  React.useEffect(() => {
    if (!isEditing && premise) {
      setLocalPremise(premise)
    }
  }, [premise, isEditing])

  const handleSave = () => {
    if (localPremise) {
      // Validation could go here
      onUpdate(localPremise as EpisodePremise)
      setIsEditing(false)
    }
  }

  const handleChange = <K extends keyof EpisodePremise>(field: K, value: EpisodePremise[K]) => {
    setLocalPremise(prev => ({ ...prev, [field]: value }))
  }

  // Auto-show variant picker hooks - must be before conditional returns
  const prevPosterUrlRef = React.useRef(posterUrl)
  const prevIsGeneratingRef = React.useRef(isGeneratingPoster)
  const hasCheckedInitialRef = React.useRef(false)

  // Compute full poster URL for use in useEffect
  const fullPosterUrl = localPremise.poster
    ? localPremise.poster.startsWith('data:')
      ? localPremise.poster
      : localPremise.poster.startsWith('http') || localPremise.poster.startsWith('/')
        ? localPremise.poster
        : localPremise.poster.startsWith('projects/')
          ? `/${localPremise.poster}`
          : `/projects/${projectId}/${localPremise.poster}`
    : posterUrl
      ? posterUrl.startsWith('http') || posterUrl.startsWith('/')
        ? posterUrl
        : posterUrl.startsWith('projects/')
          ? `/${posterUrl}`
          : `/projects/${projectId}/${posterUrl}`
      : null

  React.useEffect(() => {
    const justFinished =
      prevIsGeneratingRef.current &&
      !isGeneratingPoster &&
      posterUrl &&
      posterUrl !== prevPosterUrlRef.current

    // A URL is considered a "grid" (unpicked multi-variant) ONLY if it's an external HTTP URL.
    // Saved variants are always local paths like /projects/.../poster_xxx_v1_xxx.png
    const isGrid = posterUrl && posterUrl.startsWith('http')

    // Only auto-pop if we have a grid and haven't checked yet
    if ((justFinished || (!hasCheckedInitialRef.current && isGrid)) && fullPosterUrl) {
      setGridImageUrl(fullPosterUrl)
      setShowVariantPicker(true)
      hasCheckedInitialRef.current = true
    }

    prevPosterUrlRef.current = posterUrl
    prevIsGeneratingRef.current = isGeneratingPoster
  }, [posterUrl, isGeneratingPoster, fullPosterUrl])

  if (!premise && !isEditing) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-full">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
          <Target className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">No Episode Premise</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          This episode is a blank slate. Define the core conflict using the Ozymandias Framework:
          Hook, Flaw, Stakes, and Consequence.
        </p>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="lg"
          className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all shadow-lg shadow-primary/25 text-white"
        >
          <Sparkles className="w-5 h-5" />
          {isGenerating ? 'Architecting Premise...' : 'Generate Ozymandias Premise'}
        </Button>
      </div>
    )
  }

  const handleVariantSelect = async (variantIndex: number, croppedDataUrl: string) => {
    console.log('[EpisodePremise] handleVariantSelect called:', {
      variantIndex,
      episodeId,
      projectId,
      hasData: !!croppedDataUrl,
    })
    setShowVariantPicker(false)
    setGridImageUrl(null)

    // Optimistically update
    setLocalPremise(prev => ({ ...prev, poster: croppedDataUrl }))

    // Persist to database if episodeId is present
    if (episodeId) {
      try {
        console.log('[EpisodePremise] Calling save API...')
        const res = await fetch('/api/storyteller/save-episode-poster-variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            episodeId,
            projectId,
            croppedImageDataUrl: croppedDataUrl,
            variantIndex,
          }),
        })

        console.log('[EpisodePremise] API response status:', res.status)
        if (res.ok) {
          const data = await res.json()
          console.log('[EpisodePremise] API response data:', data)
          if (data.posterUrl) {
            setLocalPremise(prev => ({ ...prev, poster: data.posterUrl }))
            // Update parent with the permanent URL
            onUpdate({ ...localPremise, poster: data.posterUrl } as any)
            console.log('[EpisodePremise] Saved successfully, new posterUrl:', data.posterUrl)
          }
        } else {
          const err = await res.json()
          console.error('[EpisodePremise] Failed to save poster variant:', err)
        }
      } catch (error) {
        console.error('[EpisodePremise] Error saving poster variant:', error)
      }
    } else {
      console.warn('[EpisodePremise] No episodeId, skipping DB save')
      // If no episodeId yet (unlikely if generating poster), pass optimistic
      onUpdate({ ...localPremise, poster: croppedDataUrl } as any)
    }
  }

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* Main Premise Content */}
        <div className="flex-1 overflow-y-auto p-8 relative">
          {/* Header covering Title & Poster */}
          <div className="flex gap-8 mb-8">
            {/* Poster Section */}
            <div className="w-48 flex-shrink-0">
              <StorytellerImage
                src={fullPosterUrl}
                alt="Episode Poster"
                isLoading={isGeneratingPoster}
                aspectRatio="aspect-[2/3]"
                emptyLabel="No Poster"
                onGenerate={onGeneratePoster}
                overlay={
                  <div className="flex flex-col gap-2 w-full px-2">
                    {onGeneratePoster && (
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full gap-2 text-xs backdrop-blur-md bg-white/20 hover:bg-white/40 border-white/20 text-white"
                        onClick={onGeneratePoster}
                      >
                        <Sparkles className="w-3 h-3" /> Regenerate
                      </Button>
                    )}
                    {posterPrompt && (
                      <div className="text-[10px] text-white/80 text-center line-clamp-3 px-1">
                        {posterPrompt}
                      </div>
                    )}
                  </div>
                }
              />
            </div>

            {/* Title & Metadata */}
            <div className="flex-1 pt-2">
              <div className="flex items-center justify-between mb-4">
                <div>
                  {isEditing ? (
                    <input
                      className="text-4xl font-bold bg-transparent border-b border-white/20 focus:border-primary outline-none w-full mb-1 text-foreground"
                      value={localPremise.title || ''}
                      onChange={e => handleChange('title', e.target.value)}
                      placeholder="Untitled Episode"
                    />
                  ) : (
                    <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                      {localPremise.title || 'Untitled Episode'}
                    </h2>
                  )}
                  <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                    {isEditing ? (
                      <input
                        className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold uppercase tracking-wider border border-transparent focus:border-primary outline-none"
                        value={localPremise.thematicFocus || ''}
                        onChange={e => handleChange('thematicFocus', e.target.value)}
                        placeholder="THEME UNDEFINED"
                      />
                    ) : (
                      localPremise.thematicFocus && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold uppercase tracking-wider">
                          {localPremise.thematicFocus}
                        </span>
                      )
                    )}
                    {generatingSection === 'logline' ? (
                      <Skeleton className="h-5 w-64 bg-primary/10" />
                    ) : localPremise.logline && (
                      <span className="text-sm italic border-l-2 border-border pl-2">
                        "{localPremise.logline}"
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start">
                  {!isEditing && onGenerateSection && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onGenerateSection('logline')}
                      disabled={isGenerating}
                      className="gap-2"
                      title="Regenerate Description (Logline)"
                    >
                      <RefreshCw className={cn("w-4 h-4", generatingSection === 'logline' && "animate-spin")} />
                      {generatingSection === 'logline' ? 'Generating...' : localPremise.logline ? 'Regenerate Description' : 'Generate Description'}
                    </Button>
                  )}
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" /> Save
                      </Button>
                    </>
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditing(true)}
                      className="gap-2"
                      disabled={isGenerating}
                    >
                      <Edit2 className="w-4 h-4" /> Edit
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Ozymandias Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. THE HOOK */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                  <Anchor className="w-4 h-4" /> Protagonist Hook
                </div>
                {!isEditing && onGenerateSection && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-primary"
                    onClick={() => onGenerateSection('protagonistHook')}
                    disabled={isGenerating}
                    title="Regenerate Hook"
                  >
                    <RefreshCw
                      className={
                        generatingSection === 'protagonistHook'
                          ? 'w-3 h-3 animate-spin'
                          : 'w-3 h-3'
                      }
                    />
                  </Button>
                )}
              </div>
              {generatingSection === 'protagonistHook' ? (
                <div className="p-6 bg-card border border-border rounded-xl shadow-sm h-[120px] space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full p-4 bg-muted/30 border border-border rounded-lg min-h-[120px] focus:ring-2 focus:ring-primary/50 outline-none"
                  value={localPremise.protagonistHook || ''}
                  onChange={e => handleChange('protagonistHook', e.target.value)}
                  placeholder="The opening situation..."
                />
              ) : localPremise.protagonistHook ? (
                <div className="p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                  <p className="text-foreground leading-relaxed">{localPremise.protagonistHook}</p>
                </div>
              ) : (
                <div
                  className="p-6 bg-card border border-dashed border-border rounded-xl shadow-sm flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors min-h-[120px]"
                  onClick={onGenerate}
                >
                  <RefreshCw className="w-6 h-6 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Click to generate episode premise
                  </p>
                </div>
              )}
            </div>

            {/* 2. FATAL FLAW */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs">
                  <Skull className="w-4 h-4" /> Fatal Flaw
                </div>
                {!isEditing && onGenerateSection && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-red-400"
                    onClick={() => onGenerateSection('fatalFlaw')}
                    disabled={isGenerating}
                    title="Regenerate Flaw"
                  >
                    <RefreshCw
                      className={
                        generatingSection === 'fatalFlaw'
                          ? 'w-3 h-3 animate-spin'
                          : 'w-3 h-3'
                      }
                    />
                  </Button>
                )}
              </div>
              {generatingSection === 'fatalFlaw' ? (
                <div className="p-6 bg-card border border-red-500/20 rounded-xl shadow-sm h-[120px] space-y-2">
                  <Skeleton className="h-4 w-2/3 bg-red-500/10" />
                  <Skeleton className="h-4 w-full bg-red-500/10" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full p-4 bg-red-500/5 border border-red-500/20 rounded-lg min-h-[120px] focus:ring-2 focus:ring-red-500/50 outline-none"
                  value={localPremise.fatalFlaw || ''}
                  onChange={e => handleChange('fatalFlaw', e.target.value)}
                  placeholder="The internal flaw driving the conflict..."
                />
              ) : localPremise.fatalFlaw ? (
                <div className="p-6 bg-card border border-red-500/20 rounded-xl shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-8 -mt-8" />
                  <p className="text-foreground leading-relaxed relative z-10">
                    {localPremise.fatalFlaw}
                  </p>
                </div>
              ) : (
                <div
                  className="p-6 bg-card border border-dashed border-red-500/20 rounded-xl shadow-sm flex flex-col items-center justify-center cursor-pointer hover:border-red-500/50 transition-colors min-h-[120px]"
                  onClick={onGenerate}
                >
                  <RefreshCw className="w-6 h-6 text-red-400/50 mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Click to generate fatal flaw
                  </p>
                </div>
              )}
            </div>

            {/* 3. STAKES */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-orange-400 font-bold uppercase tracking-wider text-xs">
                  <TrendingUp className="w-4 h-4" /> Stakes
                </div>
                {!isEditing && onGenerateSection && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-orange-400"
                    onClick={() => onGenerateSection('stakes')}
                    disabled={isGenerating}
                    title="Regenerate Stakes"
                  >
                    <RefreshCw
                      className={
                        generatingSection === 'stakes'
                          ? 'w-3 h-3 animate-spin'
                          : 'w-3 h-3'
                      }
                    />
                  </Button>
                )}
              </div>
              {generatingSection === 'stakes' ? (
                <div className="p-6 bg-card border border-orange-500/20 rounded-xl shadow-sm h-[120px] space-y-2">
                  <Skeleton className="h-4 w-3/4 bg-orange-500/10" />
                  <Skeleton className="h-4 w-full bg-orange-500/10" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg min-h-[120px] focus:ring-2 focus:ring-orange-500/50 outline-none"
                  value={localPremise.stakes || ''}
                  onChange={e => handleChange('stakes', e.target.value)}
                  placeholder="What is strictly at risk..."
                />
              ) : localPremise.stakes ? (
                <div className="p-6 bg-card border border-orange-500/20 rounded-xl shadow-sm">
                  <p className="text-foreground leading-relaxed">{localPremise.stakes}</p>
                </div>
              ) : (
                <div
                  className="p-6 bg-card border border-dashed border-orange-500/20 rounded-xl shadow-sm flex flex-col items-center justify-center cursor-pointer hover:border-orange-500/50 transition-colors min-h-[120px]"
                  onClick={onGenerate}
                >
                  <RefreshCw className="w-6 h-6 text-orange-400/50 mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Click to generate stakes
                  </p>
                </div>
              )}
            </div>

            {/* 4. INEVITABLE CONSEQUENCE (Transformation) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider text-xs">
                  <Zap className="w-4 h-4" /> Inevitable Consequence
                </div>
                {!isEditing && onGenerateSection && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-muted-foreground hover:text-purple-400"
                    onClick={() => onGenerateSection('inevitableConsequence')}
                    disabled={isGenerating}
                    title="Regenerate Consequence"
                  >
                    <RefreshCw
                      className={
                        generatingSection === 'inevitableConsequence'
                          ? 'w-3 h-3 animate-spin'
                          : 'w-3 h-3'
                      }
                    />
                  </Button>
                )}
              </div>
              {generatingSection === 'inevitableConsequence' ? (
                <div className="p-6 bg-card border border-purple-500/20 rounded-xl shadow-sm h-[120px] space-y-2">
                  <Skeleton className="h-4 w-2/3 bg-purple-500/10" />
                  <Skeleton className="h-4 w-full bg-purple-500/10" />
                  <Skeleton className="h-4 w-1/2 bg-purple-500/10" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg min-h-[120px] focus:ring-2 focus:ring-purple-500/50 outline-none"
                  value={localPremise.inevitableConsequence || ''}
                  onChange={e => handleChange('inevitableConsequence', e.target.value)}
                  placeholder="The irreversible change..."
                />
              ) : localPremise.inevitableConsequence ? (
                <div className="p-6 bg-card border border-purple-500/20 rounded-xl shadow-sm relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-500/10 rounded-tl-full -mr-4 -mb-4" />
                  <p className="text-foreground leading-relaxed relative z-10">
                    {localPremise.inevitableConsequence}
                  </p>
                </div>
              ) : (
                <div
                  className="p-6 bg-card border border-dashed border-purple-500/20 rounded-xl shadow-sm flex flex-col items-center justify-center cursor-pointer hover:border-purple-500/50 transition-colors min-h-[120px]"
                  onClick={onGenerate}
                >
                  <RefreshCw className="w-6 h-6 text-purple-400/50 mb-2" />
                  <p className="text-sm text-muted-foreground text-center">
                    Click to generate consequence
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Side Context Panel (World Bible) */}
        {showBibleContext && globalBible && (
          <div className="w-80 border-l border-border bg-muted/10 overflow-y-auto p-6 animate-in slide-in-from-right duration-200">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider mb-4 border-b border-border pb-2">
              World Context
            </h3>

            {/* Quick Factions */}
            <div className="mb-6">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                <Target className="w-3 h-3" /> Factions
              </h4>
              <div className="space-y-2">
                {globalBible.factions?.map((f: Faction, i: number) => (
                  <div key={i} className="text-xs p-2 bg-background border border-border rounded">
                    <span className="font-bold block">{f.name}</span>
                    <span className="opacity-70">{f.ideology}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Rules */}
            <div className="mb-6">
              <h4 className="text-xs font-bold mb-2 flex items-center gap-2">
                <Book className="w-3 h-3" /> World Rules
              </h4>
              <ul className="space-y-2">
                {globalBible.worldRules?.slice(0, 3).map((r: WorldRule, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {r.rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Variant Picker */}
      {showVariantPicker && gridImageUrl && (
        <ImageVariantSelector gridImageUrl={gridImageUrl} onSelect={handleVariantSelect} />
      )}
    </>
  )
}
