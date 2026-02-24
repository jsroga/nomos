import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { X, Wand2, Loader2 } from 'lucide-react'
import { LocalStorageKeys } from '@/constants/localStorage'
import { ImageVariantSelector } from './ImageVariantSelector'
import { StorytellerImage } from './StorytellerImage'

interface InitialCharacterData {
  id?: string // For editing existing characters
  name?: string
  description?: string
  role?: string
  gender?: string
  mbti?: string
  portraitUrl?: string
  voiceSignature?: string
  archetype?: string
  motivation?: string
  fatalFlaw?: string
  secrets?: string
  psychology?: Record<string, any>
  // Metrics
  valence?: number
  arousal?: number
  autonomy?: number
  competence?: number
  relatedness?: number
  cognitiveClarity?: number
  perceivedStakes?: number
  socialSafety?: number
  moralAlignment?: number
}

interface CharacterCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (character: any) => void | Promise<void>
  onUpdate?: (characterId: string, updates: any) => void | Promise<void> // For editing
  projectId?: string // Optional: for project-scoped style references
  initialData?: InitialCharacterData // Optional: for pre-filling from key player or editing
  mode?: 'create' | 'edit' // Default: create
}

const INITIAL_METRICS = {
  valence: 0,
  arousal: 50,
  autonomy: 60,
  competence: 60,
  relatedness: 50,
  cognitiveClarity: 70,
  perceivedStakes: 40,
  socialSafety: 60,
  moralAlignment: 70,
}

export const CharacterCreationDialog: React.FC<CharacterCreationDialogProps> = ({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  projectId,
  initialData,
  mode = 'create',
}) => {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [role, setRole] = useState('Supporting')
  const [description, setDescription] = useState('')
  const [mbti, setMbti] = useState('')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [voiceSignature, setVoiceSignature] = useState('')
  const [archetype, setArchetype] = useState('')
  const [motivation, setMotivation] = useState('')
  const [fatalFlaw, setFatalFlaw] = useState('')
  const [secrets, setSecrets] = useState('')
  const [metrics, setMetrics] = useState(INITIAL_METRICS)

  const [isGeneratingMetrics, setIsGeneratingMetrics] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showVariantPicker, setShowVariantPicker] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const hasInitializedRef = React.useRef<string | null>(null)

  // Track generation state per character so background polls survive hide/show toggles
  const [genStates, setGenStates] = useState<Record<string, {
    isGenerating: boolean;
    gridImageUrl: string | null;
    needsVariantPick: boolean;
    portraitUrlOverride: string | null;
  }>>({})
  const generationIdsRef = React.useRef<Record<string, number>>({})

  const activeCharId = initialData?.id || 'new'
  const activeGenState = genStates[activeCharId] || {
    isGenerating: false,
    gridImageUrl: null,
    needsVariantPick: false,
    portraitUrlOverride: null,
  }

  const isGeneratingPortrait = activeGenState.isGenerating
  const gridImageUrl = activeGenState.gridImageUrl
  const needsVariantPick = activeGenState.needsVariantPick

  const updateGenState = (charId: string, updates: Partial<typeof activeGenState>) => {
    setGenStates(prev => ({
      ...prev,
      [charId]: { ...(prev[charId] || { isGenerating: false, gridImageUrl: null, needsVariantPick: false, portraitUrlOverride: null }), ...updates }
    }))
  }

  // Reset init ref when dialog closes so reopening the same character re-initializes the form
  useEffect(() => {
    if (!isOpen) hasInitializedRef.current = null
  }, [isOpen])

  // Pre-fill form when initialData changes (e.g., converting from key player or editing)
  useEffect(() => {
    if (isOpen && initialData) {
      // Only initialize if we haven't for this character ID yet (avoids overwriting while open)
      const charId = initialData.id || 'new'
      if (hasInitializedRef.current === charId) return

      console.log('[CharacterDialog] Initializing form with data for:', charId)
      if (initialData.name) setName(initialData.name)
      if (initialData.description) setDescription(initialData.description)
      if (initialData.role) setRole(initialData.role)
      if (initialData.gender) setGender(initialData.gender)
      if (initialData.mbti) setMbti(initialData.mbti)
      if (initialData.portraitUrl) setPortraitUrl(initialData.portraitUrl)
      if (initialData.voiceSignature) setVoiceSignature(initialData.voiceSignature)
      // Load psychology-stored fields
      const psych = initialData.psychology || {}
      setArchetype(initialData.archetype || psych.archetype || '')
      setMotivation(initialData.motivation || psych.actualMotivation || '')
      setFatalFlaw(initialData.fatalFlaw || psych.fatalFlaw || '')
      setSecrets(initialData.secrets || psych.secrets || '')

      // Removed problematic cross-character state wiping logic

      hasInitializedRef.current = charId

      // Load metrics if editing
      setMetrics(prev => ({
        ...prev,
        ...(initialData.valence !== undefined && { valence: initialData.valence }),
        ...(initialData.arousal !== undefined && { arousal: initialData.arousal }),
        ...(initialData.autonomy !== undefined && { autonomy: initialData.autonomy }),
        ...(initialData.competence !== undefined && { competence: initialData.competence }),
        ...(initialData.relatedness !== undefined && { relatedness: initialData.relatedness }),
        ...(initialData.cognitiveClarity !== undefined && {
          cognitiveClarity: initialData.cognitiveClarity,
        }),
        ...(initialData.perceivedStakes !== undefined && {
          perceivedStakes: initialData.perceivedStakes,
        }),
        ...(initialData.socialSafety !== undefined && { socialSafety: initialData.socialSafety }),
        ...(initialData.moralAlignment !== undefined && {
          moralAlignment: initialData.moralAlignment,
        }),
      }))
    }
  }, [isOpen, initialData])

  // Sync generated portraits to the local form state when generation completes
  useEffect(() => {
    if (activeGenState.portraitUrlOverride) {
      setPortraitUrl(activeGenState.portraitUrlOverride)
      updateGenState(activeCharId, { portraitUrlOverride: null })
    }
  }, [activeCharId, activeGenState.portraitUrlOverride])

  // Auto-show variant picker when generation completes
  useEffect(() => {
    if (needsVariantPick && portraitUrl && !isGeneratingPortrait) {
      setShowVariantPicker(true)
      updateGenState(activeCharId, { needsVariantPick: false })
    }
  }, [needsVariantPick, portraitUrl, isGeneratingPortrait, activeCharId])

  // Only render when open - check after all hooks
  if (!isOpen) return null

  // Reset form when dialog closes
  const handleClose = () => {
    setName('')
    setGender('')
    setRole('Supporting')
    setDescription('')
    setMbti('')
    setPortraitUrl('')
    setVoiceSignature('')
    setArchetype('')
    setMotivation('')
    setFatalFlaw('')
    setSecrets('')
    setMetrics(INITIAL_METRICS)
    setShowVariantPicker(false)
    setTouched({})
    onClose()
  }

  const handleGeneratePortrait = async () => {
    if (!description && !name) return
    const targetCharId = activeCharId
    updateGenState(targetCharId, {
      isGenerating: true,
      gridImageUrl: null,
      needsVariantPick: false,
      portraitUrlOverride: null
    })

    generationIdsRef.current[targetCharId] = (generationIdsRef.current[targetCharId] || 0) + 1
    const currentGenId = generationIdsRef.current[targetCharId]

    try {
      // Get LegNext API key from localStorage
      let apiKey = ''
      const savedLegNext = localStorage.getItem(LocalStorageKeys.AI_CONFIG_LEGNEXT)
      if (savedLegNext) {
        const legnextConfig = JSON.parse(savedLegNext)
        apiKey = legnextConfig.apiKey || ''
      }

      const res = await fetch('/api/storyteller/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: description || `A portrait of ${name}, ${gender}`,
          projectId: projectId,
          apiKey: apiKey,
        }),
      })
      const data = await res.json()

      if (!data.handleId) {
        console.error('No handleId returned:', data)
        updateGenState(targetCharId, { isGenerating: false })
        return
      }

      // Poll for completion
      const maxAttempts = 60 // 5 minutes (5s * 60)
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise(r => setTimeout(r, 5000)) // Poll every 5s

        if (currentGenId !== generationIdsRef.current[targetCharId]) {
          console.log('[CharacterDialog] Portrait generation polling cancelled for', targetCharId)
          break
        }

        const statusRes = await fetch(
          `/api/storyteller/generate-portrait/status?runId=${data.handleId}`
        )
        const statusData = await statusRes.json()

        if (statusData.status === 'COMPLETED') {
          if (statusData.output?.imageUrl) {
            const newUrl = statusData.output.imageUrl
            updateGenState(targetCharId, {
              isGenerating: false,
              gridImageUrl: newUrl,
              needsVariantPick: true,
              portraitUrlOverride: newUrl
            })
          } else {
            updateGenState(targetCharId, { isGenerating: false })
          }
          break
        } else if (statusData.status === 'FAILED' || statusData.error) {
          console.error('Portrait generation failed:', statusData.error)
          updateGenState(targetCharId, { isGenerating: false })
          break
        }
        // Continue polling if PENDING, EXECUTING, etc.
      }
    } catch (error) {
      console.error('Failed to generate portrait:', error)
      updateGenState(targetCharId, { isGenerating: false })
    }
  }

  const handleGenerateMetrics = async () => {
    if (!description) return
    setIsGeneratingMetrics(true)
    try {
      const res = await fetch('/api/storyteller/generate-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      })
      const data = await res.json()
      if (data.metrics) {
        setMetrics(prev => ({ ...prev, ...data.metrics }))
      }
    } catch (error) {
      console.error('Failed to generate metrics:', error)
    } finally {
      setIsGeneratingMetrics(false)
    }
  }

  const handleVariantSelect = async (croppedDataUrl: string, variantIndex: number) => {
    setShowVariantPicker(false)
    updateGenState(activeCharId, { gridImageUrl: null })

    // Optimistically update to cropped image (base64)
    setPortraitUrl(croppedDataUrl)

    // Save to server
    if (initialData?.id && projectId) {
      try {
        const res = await fetch('/api/storyteller/save-portrait-variant', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            characterId: initialData.id,
            projectId,
            croppedImageDataUrl: croppedDataUrl,
            variantIndex,
          }),
        })

        if (res.ok) {
          const data = await res.json()
          if (data.portraitUrl) {
            console.log('[CharacterDialog] Variant saved, updating URL to:', data.portraitUrl)
            setPortraitUrl(data.portraitUrl)
          }
        }
      } catch (error) {
        console.error('Failed to save variant to server:', error)
      }
    }
  }

  // ... (rest of the file until return)

  const handleSubmit = async () => {
    if (!name || !gender || !role || !description || !mbti) {
      setTouched({
        name: true,
        gender: true,
        role: true,
        description: true,
        mbti: true,
      })
      return
    }

    const characterData = {
      name,
      gender,
      description,
      mbti,
      portraitUrl,
      voiceSignature,
      ...metrics,
      role: role || 'Supporting',
      transformation: 0,
      characterPrompt: `You are ${name}. ${description}`,
      psychology: {
        ...(archetype ? { archetype } : {}),
        ...(motivation ? { actualMotivation: motivation } : {}),
        ...(fatalFlaw ? { fatalFlaw } : {}),
        ...(secrets ? { secrets } : {}),
      },
    }

    setIsSaving(true)
    try {
      if (mode === 'edit' && initialData?.id && onUpdate) {
        await onUpdate(initialData.id, characterData)
      } else {
        await onCreate(characterData)
      }
      handleClose()
    } catch (error) {
      console.error('Failed to save character:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Use Portal to render modal at document root, escaping sidebar CSS containment
  const modalContent = (
    <>
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-card border border-border w-full max-w-2xl rounded-lg shadow-lg flex flex-col max-h-[90vh] mx-4">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-bold">
              {mode === 'edit'
                ? 'Edit Character'
                : initialData
                  ? 'Convert to Cast'
                  : 'Create New Character'}
            </h2>
            <Button variant="outline" size="sm" onClick={handleClose}>
              <X size={16} />
            </Button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Name <span className="text-destructive">*</span>
                </label>
                <input
                  className={`w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none ${touched.name && !name ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input focus:ring-2 focus:ring-primary'}`}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, name: true }))}
                  placeholder="Character Name"
                />
                {touched.name && !name && <p className="text-xs text-destructive mt-1">Name is required</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Role <span className="text-destructive">*</span>
                  </label>
                  <select
                    className={`w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none ${touched.role && !role ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input focus:ring-2 focus:ring-primary'}`}
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, role: true }))}
                  >
                    <option value="Protagonist">Protagonist</option>
                    <option value="Antagonist">Antagonist</option>
                    <option value="Supporting">Supporting</option>
                  </select>
                  {touched.role && !role && <p className="text-xs text-destructive mt-1">Role is required</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Gender <span className="text-destructive">*</span>
                  </label>
                  <select
                    className={`w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none ${touched.gender && !gender ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input focus:ring-2 focus:ring-primary'}`}
                    value={gender}
                    onChange={e => setGender(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, gender: true }))}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                    <option value="Other">Other</option>
                  </select>
                  {touched.gender && !gender && <p className="text-xs text-destructive mt-1">Gender is required</p>}
                </div>
              </div>
            </div>

            {/* Description & Portrait */}
            <div className="grid grid-cols-3 gap-6">
              <div className="col-span-2 space-y-2">
                <label className="text-sm font-medium">
                  Description <span className="text-destructive">*</span>
                </label>
                <textarea
                  className={`w-full h-32 bg-background border rounded-md px-3 py-2 text-sm resize-none focus:outline-none ${touched.description && !description ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input focus:ring-2 focus:ring-primary'}`}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                  placeholder="Describe appearance, personality, and background..."
                />
                {touched.description && !description && <p className="text-xs text-destructive mt-1">Description is required</p>}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    MBTI <span className="text-destructive">*</span>
                  </label>
                  <select
                    className={`w-full bg-background border rounded-md px-3 py-2 text-sm focus:outline-none ${touched.mbti && !mbti ? 'border-destructive focus:ring-2 focus:ring-destructive' : 'border-input focus:ring-2 focus:ring-primary'}`}
                    value={mbti}
                    onChange={e => setMbti(e.target.value)}
                    onBlur={() => setTouched(prev => ({ ...prev, mbti: true }))}
                  >
                    <option value="">Select MBTI Type</option>
                    <optgroup label="Analysts">
                      <option value="INTJ">INTJ - Architect</option>
                      <option value="INTP">INTP - Logician</option>
                      <option value="ENTJ">ENTJ - Commander</option>
                      <option value="ENTP">ENTP - Debater</option>
                    </optgroup>
                    <optgroup label="Diplomats">
                      <option value="INFJ">INFJ - Advocate</option>
                      <option value="INFP">INFP - Mediator</option>
                      <option value="ENFJ">ENFJ - Protagonist</option>
                      <option value="ENFP">ENFP - Campaigner</option>
                    </optgroup>
                    <optgroup label="Sentinels">
                      <option value="ISTJ">ISTJ - Logistician</option>
                      <option value="ISFJ">ISFJ - Defender</option>
                      <option value="ESTJ">ESTJ - Executive</option>
                      <option value="ESFJ">ESFJ - Consul</option>
                    </optgroup>
                    <optgroup label="Explorers">
                      <option value="ISTP">ISTP - Virtuoso</option>
                      <option value="ISFP">ISFP - Adventurer</option>
                      <option value="ESTP">ESTP - Entrepreneur</option>
                      <option value="ESFP">ESFP - Entertainer</option>
                    </optgroup>
                  </select>
                  {touched.mbti && !mbti && <p className="text-xs text-destructive mt-1">MBTI is required</p>}
                </div>
              </div>

              {/* Portrait Area */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Portrait</label>
                <div className="w-full">
                  <StorytellerImage
                    src={portraitUrl}
                    alt={name || 'Character Portrait'}
                    isLoading={isGeneratingPortrait}
                    aspectRatio="aspect-square"
                    emptyLabel={description ? 'Ready to Imagine' : 'Describe character first'}
                    onGenerate={!name && !description ? undefined : handleGeneratePortrait}
                    overlay={
                      <div className="flex flex-col gap-2 w-full px-2">
                        {((portraitUrl && !/_(v\d|cropped)_/.test(portraitUrl) && !portraitUrl.startsWith('data:')) || gridImageUrl) && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="w-full text-xs backdrop-blur-md bg-primary/60 hover:bg-primary/80 border-primary/40 text-white"
                            onClick={() => {
                              if (!gridImageUrl && portraitUrl) {
                                setGridImageUrl(portraitUrl)
                              }
                              setShowVariantPicker(true)
                            }}
                          >
                            <Wand2 className="w-3 h-3 mr-1" />
                            Pick Variant
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          className="w-full text-xs backdrop-blur-md bg-white/20 hover:bg-white/40 border-white/20 text-white"
                          onClick={handleGeneratePortrait}
                          disabled={isGeneratingPortrait}
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    }
                  />
                </div>
                <div className="text-[10px] text-muted-foreground text-center">
                  {portraitUrl && !/_(v\d|cropped)_/.test(portraitUrl)
                    ? 'Hover image & click "Pick Variant" to choose'
                    : portraitUrl
                      ? 'Variant selected'
                      : 'Powered by Midjourney'}
                </div>
              </div>
            </div>

            {/* Character Psychology */}
            <div className="space-y-4 pt-4 border-t border-border">
              <h3 className="text-sm font-bold">Character Psychology</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Archetype</label>
                  <input
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={archetype}
                    onChange={e => setArchetype(e.target.value)}
                    placeholder="e.g. The Reluctant Hero, The Trickster"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Voice Signature</label>
                  <input
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={voiceSignature}
                    onChange={e => setVoiceSignature(e.target.value)}
                    placeholder="e.g. Clipped military cadence, dry humor"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Motivation</label>
                <input
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  value={motivation}
                  onChange={e => setMotivation(e.target.value)}
                  placeholder="What truly drives this character?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-destructive/80">Fatal Flaw</label>
                  <input
                    className="w-full bg-background border border-destructive/20 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-destructive/50 focus:outline-none"
                    value={fatalFlaw}
                    onChange={e => setFatalFlaw(e.target.value)}
                    placeholder="The weakness that could undo them"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-amber-500/80">Secret</label>
                  <input
                    className="w-full bg-background border border-amber-500/20 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 focus:outline-none"
                    value={secrets}
                    onChange={e => setSecrets(e.target.value)}
                    placeholder="What they hide from everyone"
                  />
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold">Baseline Psychological Metrics</h3>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={handleGenerateMetrics}
                  disabled={isGeneratingMetrics || !description}
                >
                  {isGeneratingMetrics ? (
                    <Loader2 className="animate-spin w-3 h-3 mr-1" />
                  ) : (
                    <Wand2 className="w-3 h-3 mr-1" />
                  )}
                  Auto-set from Description
                </Button>
              </div>

              {/* Emotional State */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Emotional State
                </h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span
                        className="text-muted-foreground"
                        title="Emotional tone from very negative to very positive"
                      >
                        Valence
                      </span>
                      <span className="font-mono">
                        {metrics.valence > 0 ? '+' : ''}
                        {metrics.valence}
                      </span>
                    </div>
                    <Slider
                      value={[metrics.valence + 100]}
                      max={200}
                      step={1}
                      onValueChange={([val]) =>
                        setMetrics(prev => ({ ...prev, valence: val - 100 }))
                      }
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                      <span>Negative</span>
                      <span>Positive</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground" title="Energy and activation level">
                        Arousal
                      </span>
                      <span className="font-mono">{metrics.arousal}%</span>
                    </div>
                    <Slider
                      value={[metrics.arousal]}
                      max={100}
                      step={1}
                      onValueChange={([val]) => setMetrics(prev => ({ ...prev, arousal: val }))}
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/60">
                      <span>Lethargic</span>
                      <span>Energized</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Core Psychological Needs */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Core Needs
                </h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span
                        className="text-muted-foreground"
                        title="Perceived freedom and self-direction"
                      >
                        Autonomy
                      </span>
                      <span className="font-mono">{metrics.autonomy}%</span>
                    </div>
                    <Slider
                      value={[metrics.autonomy]}
                      max={100}
                      step={1}
                      onValueChange={([val]) => setMetrics(prev => ({ ...prev, autonomy: val }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span
                        className="text-muted-foreground"
                        title="Belief in capability to handle challenges"
                      >
                        Competence
                      </span>
                      <span className="font-mono">{metrics.competence}%</span>
                    </div>
                    <Slider
                      value={[metrics.competence]}
                      max={100}
                      step={1}
                      onValueChange={([val]) => setMetrics(prev => ({ ...prev, competence: val }))}
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground" title="Sense of connection to others">
                        Relatedness
                      </span>
                      <span className="font-mono">{metrics.relatedness}%</span>
                    </div>
                    <Slider
                      value={[metrics.relatedness]}
                      max={100}
                      step={1}
                      onValueChange={([val]) => setMetrics(prev => ({ ...prev, relatedness: val }))}
                    />
                  </div>
                </div>
              </div>

              {/* Mental State */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Mental State
                </h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span
                        className="text-muted-foreground"
                        title="Mental sharpness and decision-making capacity"
                      >
                        Cognitive Clarity
                      </span>
                      <span className="font-mono">{metrics.cognitiveClarity}%</span>
                    </div>
                    <Slider
                      value={[metrics.cognitiveClarity]}
                      max={100}
                      step={1}
                      onValueChange={([val]) =>
                        setMetrics(prev => ({ ...prev, cognitiveClarity: val }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span
                        className="text-muted-foreground"
                        title="How much they believe is on the line"
                      >
                        Perceived Stakes
                      </span>
                      <span className="font-mono">{metrics.perceivedStakes}%</span>
                    </div>
                    <Slider
                      value={[metrics.perceivedStakes]}
                      max={100}
                      step={1}
                      onValueChange={([val]) =>
                        setMetrics(prev => ({ ...prev, perceivedStakes: val }))
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Social & Moral */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Social & Moral
                </h4>
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span
                        className="text-muted-foreground"
                        title="Perceived safety in current social context"
                      >
                        Social Safety
                      </span>
                      <span className="font-mono">{metrics.socialSafety}%</span>
                    </div>
                    <Slider
                      value={[metrics.socialSafety]}
                      max={100}
                      step={1}
                      onValueChange={([val]) =>
                        setMetrics(prev => ({ ...prev, socialSafety: val }))
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span
                        className="text-muted-foreground"
                        title="Alignment between actions and values"
                      >
                        Moral Alignment
                      </span>
                      <span className="font-mono">{metrics.moralAlignment}%</span>
                    </div>
                    <Slider
                      value={[metrics.moralAlignment]}
                      max={100}
                      step={1}
                      onValueChange={([val]) =>
                        setMetrics(prev => ({ ...prev, moralAlignment: val }))
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-border flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleSubmit}
              disabled={isSaving}
            >
              {isSaving ? (
                <><Loader2 className="animate-spin w-4 h-4 mr-2" />Saving...</>
              ) : mode === 'edit'
                ? 'Save Changes'
                : initialData
                  ? 'Convert to Cast'
                  : 'Create Character'}
            </Button>
          </div>
        </div>
      </div>

      {/* Portrait Variant Picker Modal */}
      {showVariantPicker && gridImageUrl && (
        <ImageVariantSelector
          gridImageUrl={gridImageUrl}
          onSelect={(index, croppedDataUrl) => handleVariantSelect(croppedDataUrl, index)}
          onCancel={() => {
            setShowVariantPicker(false)
          }}
        />
      )}
    </>
  )

  // Render at document body to escape any parent CSS containment
  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body)
  }

  return modalContent
}
