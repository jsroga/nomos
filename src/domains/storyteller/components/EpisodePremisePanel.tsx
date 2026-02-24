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
  ListOrdered,
  Trash2,
  Plus,
} from 'lucide-react'
import { EpisodePremise, StoryPlan, Faction, WorldRule } from '../schemas/agent-schemas'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StorytellerImage } from './StorytellerImage'
import { ImageVariantSelector } from './ImageVariantSelector'
import { ReferenceText } from './ReferenceText'
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
    section: 'protagonistHook' | 'fatalFlaw' | 'stakes' | 'inevitableConsequence' | 'logline' | 'tenPointsPlan'
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

  const lastSavedPremise = React.useRef<string | null>(null)

  // Sync local state if props change (and not editing)
  React.useEffect(() => {
    if (isEditing || !premise) return

    const premiseStr = JSON.stringify(premise)

    // If we just saved something, ignore incoming props until they match our saved string
    if (lastSavedPremise.current) {
      if (lastSavedPremise.current === premiseStr) {
        // Parent finally caught up! Clear the lock
        lastSavedPremise.current = null
        // Also sync local state just in case there were minor differences
        setLocalPremise(premise)
      } else {
        // Parent is still sending old data, ignore it to prevent flickering/reverting
        return
      }
    } else {
      // No lock, so sync if the prop actually changed from what we have locally
      const localStr = JSON.stringify(localPremise)
      if (localStr !== premiseStr) {
        setLocalPremise(premise)
      }
    }
  }, [premise, isEditing, localPremise])

  const handleSave = () => {
    if (localPremise) {
      // Validation could go here
      const toSave = localPremise as EpisodePremise
      lastSavedPremise.current = JSON.stringify(toSave)
      onUpdate(toSave)
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
      <div className="flex flex-col items-center justify-center p-12 text-center h-full min-h-[320px]">
        <div className="w-14 h-14 border-2 border-primary/30 rounded-md flex items-center justify-center mb-6">
          <Target className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-mono text-xl font-semibold tracking-tight mb-2 text-foreground">
          No Episode Premise
        </h2>
        <p className="text-muted-foreground text-sm max-w-sm mb-8 leading-relaxed">
          Define the core conflict using the Ozymandias Framework: Hook, Flaw, Stakes, and
          Consequence.
        </p>
        <Button
          onClick={onGenerate}
          disabled={isGenerating}
          size="lg"
          className="gap-2 rounded-md font-medium"
        >
          <Sparkles className="w-4 h-4" />
          {isGenerating ? 'Architecting…' : 'Generate Ozymandias Premise'}
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
        <div className="flex-1 min-h-0 overflow-y-auto p-6 md:p-8 relative">
          {/* Actions above header, aligned right */}
          <div className="w-full flex justify-end mb-6">
            <div className="flex items-center gap-1.5 opacity-60 hover:opacity-100 focus-within:opacity-100 transition-opacity">
              {!isEditing && onGenerateSection && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onGenerateSection('logline')}
                  disabled={isGenerating}
                  className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  title="Regenerate Description (Logline)"
                >
                  <RefreshCw
                    className={cn('w-3.5 h-3.5', generatingSection === 'logline' && 'animate-spin')}
                  />
                  {generatingSection === 'logline'
                    ? 'Generating…'
                    : localPremise.logline
                      ? 'Regenerate Description'
                      : 'Generate Description'}
                </Button>
              )}
              {isEditing ? (
                <>
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)} className="rounded-md text-xs text-muted-foreground hover:text-foreground h-7 px-2">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} className="gap-1.5 rounded-md text-xs h-7 px-2">
                    <Save className="w-3.5 h-3.5" /> Save
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="gap-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground h-7 px-2"
                  disabled={isGenerating}
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
              )}
            </div>
          </div>

          {/* Header: full width (title only) */}
          <header className="w-full border-b border-border pb-4 mb-6">
            <div className="flex flex-wrap items-center gap-2 w-full">
              {isEditing ? (
                <input
                  className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight bg-transparent border-b border-border focus:border-primary outline-none flex-1 min-w-[12rem] text-foreground"
                  value={localPremise.title || ''}
                  onChange={e => handleChange('title', e.target.value)}
                  placeholder="Untitled Episode"
                />
              ) : (
                <h2 className="font-mono text-2xl sm:text-3xl font-semibold tracking-tight text-foreground break-words">
                  {localPremise.title || 'Untitled Episode'}
                </h2>
              )}
            </div>
          </header>

          {/* Poster | Right side (quote, description, actions) */}
          <div className="w-full flex flex-col sm:flex-row gap-6 sm:gap-8 mb-8">
            <div className="w-40 sm:w-44 flex-shrink-0">
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
                        className="w-full gap-2 text-xs rounded-md"
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
            <div className="flex-1 min-w-[14rem] flex flex-col gap-3">
              {/* Thematic focus — above quote */}
              {isEditing ? (
                <input
                  className="px-2 py-1 bg-muted border border-border text-foreground rounded-md text-xs font-mono uppercase tracking-wider focus:border-primary outline-none w-full mb-2"
                  value={localPremise.thematicFocus || ''}
                  onChange={e => handleChange('thematicFocus', e.target.value)}
                  placeholder="THEME"
                />
              ) : (
                localPremise.thematicFocus && (
                  <span className="px-2 py-1 bg-muted border border-border text-foreground rounded-md text-xs font-mono uppercase tracking-wider shrink-0 mb-2">
                    {localPremise.thematicFocus}
                  </span>
                )
              )}
              {/* Description (helper when empty) */}
              {generatingSection === 'logline' ? (
                <Skeleton className="h-10 w-full rounded-md bg-muted mb-4" />
              ) : !localPremise.logline ? (
                <p className="text-sm text-muted-foreground mb-4">No description yet. Use Regenerate Description to generate a logline.</p>
              ) : null}
              {/* Quote (logline) */}
              {localPremise.logline && (
                <blockquote className="text-sm border-l-2 border-primary/50 pl-4 text-foreground/90 break-words italic">
                  "{localPremise.logline}"
                </blockquote>
              )}
            </div>
          </div>

          {/* Ozymandias — sharp section blocks */}
          <div className="space-y-5 w-full">
            {/* 1. Protagonist Hook */}
            <section className="space-y-2 w-full">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary flex items-center gap-2">
                  <Anchor className="w-3.5 h-3.5" /> Protagonist Hook
                </span>
                {!isEditing && onGenerateSection && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-md text-muted-foreground hover:text-primary"
                    onClick={() => onGenerateSection('protagonistHook')}
                    disabled={isGenerating}
                    title="Regenerate Hook"
                  >
                    <RefreshCw
                      className={
                        generatingSection === 'protagonistHook' ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'
                      }
                    />
                  </Button>
                )}
              </div>
              {generatingSection === 'protagonistHook' ? (
                <div className="p-4 bg-card border border-border rounded-md h-[100px] space-y-2">
                  <Skeleton className="h-3 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-full rounded-md" />
                  <Skeleton className="h-3 w-5/6 rounded-md" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full p-4 bg-muted/50 border border-border rounded-md min-h-[100px] text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none"
                  value={localPremise.protagonistHook || ''}
                  onChange={e => handleChange('protagonistHook', e.target.value)}
                  placeholder="The opening situation..."
                />
              ) : localPremise.protagonistHook ? (
                <div className="p-4 bg-card border border-border rounded-md">
                  <ReferenceText
                    text={localPremise.protagonistHook}
                    projectId={projectId}
                    className="text-foreground text-sm leading-relaxed"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full p-4 bg-card border border-dashed border-border rounded-md flex flex-col items-center justify-center min-h-[100px] hover:border-primary/50 hover:bg-muted/20 transition-colors text-left"
                  onClick={onGenerate}
                >
                  <RefreshCw className="w-5 h-5 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground">Generate episode premise</span>
                </button>
              )}
            </section>

            {/* 2. Fatal Flaw */}
            <section className="space-y-2 w-full">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-red-400 flex items-center gap-2">
                  <Skull className="w-3.5 h-3.5" /> Fatal Flaw
                </span>
                {!isEditing && onGenerateSection && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-md text-muted-foreground hover:text-red-400"
                    onClick={() => onGenerateSection('fatalFlaw')}
                    disabled={isGenerating}
                    title="Regenerate Flaw"
                  >
                    <RefreshCw
                      className={
                        generatingSection === 'fatalFlaw' ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'
                      }
                    />
                  </Button>
                )}
              </div>
              {generatingSection === 'fatalFlaw' ? (
                <div className="p-4 bg-card border border-red-500/20 rounded-md h-[100px] space-y-2">
                  <Skeleton className="h-3 w-2/3 rounded-md bg-red-500/10" />
                  <Skeleton className="h-3 w-full rounded-md bg-red-500/10" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full p-4 bg-red-500/5 border border-red-500/20 rounded-md min-h-[100px] text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500/30 outline-none"
                  value={localPremise.fatalFlaw || ''}
                  onChange={e => handleChange('fatalFlaw', e.target.value)}
                  placeholder="The internal flaw driving the conflict..."
                />
              ) : localPremise.fatalFlaw ? (
                <div className="p-4 bg-card border border-red-500/20 rounded-md">
                  <ReferenceText
                    text={localPremise.fatalFlaw}
                    projectId={projectId}
                    className="text-foreground text-sm leading-relaxed"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full p-4 bg-card border border-dashed border-red-500/20 rounded-md flex flex-col items-center justify-center min-h-[100px] hover:border-red-500/50 hover:bg-red-500/5 transition-colors text-left"
                  onClick={onGenerate}
                >
                  <RefreshCw className="w-5 h-5 text-red-400/50 mb-2" />
                  <span className="text-xs text-muted-foreground">Generate fatal flaw</span>
                </button>
              )}
            </section>

            {/* 3. Stakes */}
            <section className="space-y-2 w-full">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-orange-400 flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5" /> Stakes
                </span>
                {!isEditing && onGenerateSection && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-md text-muted-foreground hover:text-orange-400"
                    onClick={() => onGenerateSection('stakes')}
                    disabled={isGenerating}
                    title="Regenerate Stakes"
                  >
                    <RefreshCw
                      className={
                        generatingSection === 'stakes' ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'
                      }
                    />
                  </Button>
                )}
              </div>
              {generatingSection === 'stakes' ? (
                <div className="p-4 bg-card border border-orange-500/20 rounded-md h-[100px] space-y-2">
                  <Skeleton className="h-3 w-3/4 rounded-md bg-orange-500/10" />
                  <Skeleton className="h-3 w-full rounded-md bg-orange-500/10" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full p-4 bg-orange-500/5 border border-orange-500/20 rounded-md min-h-[100px] text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500/30 outline-none"
                  value={localPremise.stakes || ''}
                  onChange={e => handleChange('stakes', e.target.value)}
                  placeholder="What is strictly at risk..."
                />
              ) : localPremise.stakes ? (
                <div className="p-4 bg-card border border-orange-500/20 rounded-md">
                  <ReferenceText
                    text={localPremise.stakes}
                    projectId={projectId}
                    className="text-foreground text-sm leading-relaxed"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full p-4 bg-card border border-dashed border-orange-500/20 rounded-md flex flex-col items-center justify-center min-h-[100px] hover:border-orange-500/50 hover:bg-orange-500/5 transition-colors text-left"
                  onClick={onGenerate}
                >
                  <RefreshCw className="w-5 h-5 text-orange-400/50 mb-2" />
                  <span className="text-xs text-muted-foreground">Generate stakes</span>
                </button>
              )}
            </section>

            {/* 4. Inevitable Consequence */}
            <section className="space-y-2 w-full">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-purple-400 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" /> Inevitable Consequence
                </span>
                {!isEditing && onGenerateSection && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-md text-muted-foreground hover:text-purple-400"
                    onClick={() => onGenerateSection('inevitableConsequence')}
                    disabled={isGenerating}
                    title="Regenerate Consequence"
                  >
                    <RefreshCw
                      className={
                        generatingSection === 'inevitableConsequence'
                          ? 'w-3.5 h-3.5 animate-spin'
                          : 'w-3.5 h-3.5'
                      }
                    />
                  </Button>
                )}
              </div>
              {generatingSection === 'inevitableConsequence' ? (
                <div className="p-4 bg-card border border-purple-500/20 rounded-md h-[100px] space-y-2">
                  <Skeleton className="h-3 w-2/3 rounded-md bg-purple-500/10" />
                  <Skeleton className="h-3 w-full rounded-md bg-purple-500/10" />
                  <Skeleton className="h-3 w-1/2 rounded-md bg-purple-500/10" />
                </div>
              ) : isEditing ? (
                <textarea
                  className="w-full p-4 bg-purple-500/5 border border-purple-500/20 rounded-md min-h-[100px] text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none"
                  value={localPremise.inevitableConsequence || ''}
                  onChange={e => handleChange('inevitableConsequence', e.target.value)}
                  placeholder="The irreversible change..."
                />
              ) : localPremise.inevitableConsequence ? (
                <div className="p-4 bg-card border border-purple-500/20 rounded-md">
                  <ReferenceText
                    text={localPremise.inevitableConsequence}
                    projectId={projectId}
                    className="text-foreground text-sm leading-relaxed"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  className="w-full p-4 bg-card border border-dashed border-purple-500/20 rounded-md flex flex-col items-center justify-center min-h-[100px] hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors text-left"
                  onClick={onGenerate}
                >
                  <RefreshCw className="w-5 h-5 text-purple-400/50 mb-2" />
                  <span className="text-xs text-muted-foreground">Generate consequence</span>
                </button>
              )}
            </section>
          </div>

          {/* 10-Point Episode Plan */}
          <div className="mt-8 mb-10 w-full">
            <div className="flex items-center justify-between mb-3 w-full">
              <span className="font-mono text-[11px] font-medium uppercase tracking-widest text-primary flex items-center gap-2">
                <ListOrdered className="w-4 h-4" /> 10-Point Episode Plan
              </span>
              {!isEditing && onGenerateSection && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-2 rounded-md text-muted-foreground hover:text-primary text-xs"
                  onClick={() => onGenerateSection('tenPointsPlan' as any)}
                  disabled={isGenerating}
                >
                  <RefreshCw
                    className={
                      generatingSection === 'tenPointsPlan' ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'
                    }
                  />
                  {localPremise.tenPointsPlan && localPremise.tenPointsPlan.length > 0
                    ? 'Regenerate'
                    : 'Generate'}
                </Button>
              )}
            </div>

            {generatingSection === 'tenPointsPlan' ? (
              <div className="space-y-3 p-4 bg-card border border-border rounded-md">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="h-6 w-6 rounded-md flex-shrink-0" />
                    <Skeleton className="h-4 flex-1 rounded-md" />
                  </div>
                ))}
              </div>
            ) : isEditing ? (
              <div className="space-y-3 p-4 bg-muted/30 border border-border rounded-md">
                {(localPremise.tenPointsPlan || []).map((point, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-mono text-xs font-medium">
                      {index + 1}
                    </div>
                    <textarea
                      className="flex-1 p-3 bg-background border border-border rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary/30 outline-none min-h-[56px]"
                      value={typeof point === 'object' ? JSON.stringify(point) : String(point)}
                      onChange={e => {
                        const newPlan = [...(localPremise.tenPointsPlan || [])]
                        newPlan[index] = e.target.value
                        handleChange('tenPointsPlan', newPlan)
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 rounded-md text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={() => {
                        const newPlan = [...(localPremise.tenPointsPlan || [])]
                        newPlan.splice(index, 1)
                        handleChange('tenPointsPlan', newPlan)
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2 rounded-md border-dashed text-xs"
                  onClick={() => {
                    const newPlan = [...(localPremise.tenPointsPlan || [])]
                    newPlan.push('')
                    handleChange('tenPointsPlan', newPlan)
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Step
                </Button>
              </div>
            ) : localPremise.tenPointsPlan && localPremise.tenPointsPlan.length > 0 ? (
              <div className="space-y-2 p-4 bg-card border border-border rounded-md">
                {localPremise.tenPointsPlan.map((point, index) => (
                  <div key={index} className="flex gap-4 group items-start">
                    <div className="flex-shrink-0 w-7 h-7 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground font-mono text-xs font-medium group-hover:border-primary group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      {typeof point === 'object' && point !== null ? (
                        Object.entries(point).map(([k, v]) => (
                          <div key={k} className="mb-1">
                            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mr-2">
                              {k}:
                            </span>
                            <ReferenceText
                              text={String(v)}
                              projectId={projectId}
                              className="text-foreground text-sm leading-relaxed"
                            />
                          </div>
                        ))
                      ) : (
                        <ReferenceText
                          text={String(point)}
                          projectId={projectId}
                          className="text-foreground text-sm leading-relaxed"
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <button
                type="button"
                className="w-full p-8 bg-card border border-dashed border-border rounded-md flex flex-col items-center justify-center min-h-[180px] hover:border-primary/50 hover:bg-muted/20 transition-colors"
                onClick={() => onGenerateSection && onGenerateSection('tenPointsPlan' as any)}
              >
                <ListOrdered className="w-10 h-10 text-muted-foreground mb-3" />
                <h3 className="font-mono text-sm font-semibold tracking-tight mb-1">No 10-Point Plan</h3>
                <p className="text-xs text-muted-foreground text-center max-w-sm leading-relaxed">
                  Generate a high-level outline before breaking it down into beats.
                </p>
                <span className="mt-4 text-xs text-primary font-medium">Generate Plan</span>
              </button>
            )}
          </div>
        </div>

        {/* Side Context Panel (World Bible) */}
        {showBibleContext && globalBible && (
          <div className="w-72 border-l border-border bg-muted/10 overflow-y-auto p-4 animate-in slide-in-from-right duration-200">
            <h3 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted-foreground mb-4 border-b border-border pb-2">
              World Context
            </h3>
            <div className="mb-5">
              <h4 className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Target className="w-3 h-3" /> Factions
              </h4>
              <div className="space-y-2">
                {globalBible.factions?.map((f: Faction, i: number) => (
                  <div key={i} className="text-xs p-2 bg-background border border-border rounded-md">
                    <span className="font-medium block">{f.name}</span>
                    <span className="text-muted-foreground">{f.ideology}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-mono text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">
                <Book className="w-3 h-3" /> World Rules
              </h4>
              <ul className="space-y-1.5">
                {globalBible.worldRules?.slice(0, 3).map((r: WorldRule, i: number) => (
                  <li key={i} className="text-xs text-muted-foreground pl-1 border-l border-border">
                    {r.rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>


      {showVariantPicker && gridImageUrl && (
        <ImageVariantSelector gridImageUrl={gridImageUrl} onSelect={handleVariantSelect} />
      )
      }
    </>
  )
}
