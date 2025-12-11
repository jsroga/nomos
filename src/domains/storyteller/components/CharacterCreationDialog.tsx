import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { X, Wand2, Upload, User, Loader2 } from 'lucide-react'
import { LocalStorageKeys } from '@/constants/localStorage'

interface InitialCharacterData {
  name?: string
  description?: string
  role?: string
}

interface CharacterCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (character: any) => void
  projectId?: string // Optional: for project-scoped style references
  initialData?: InitialCharacterData // Optional: for pre-filling from key player
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
  projectId,
  initialData,
}) => {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [description, setDescription] = useState('')
  const [mbti, setMbti] = useState('')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [metrics, setMetrics] = useState(INITIAL_METRICS)
  const [initialRole, setInitialRole] = useState<string | undefined>(undefined)

  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false)
  const [isGeneratingMetrics, setIsGeneratingMetrics] = useState(false)

  // Pre-fill form when initialData changes (e.g., converting from key player)
  useEffect(() => {
    if (isOpen && initialData) {
      if (initialData.name) setName(initialData.name)
      if (initialData.description) setDescription(initialData.description)
      if (initialData.role) setInitialRole(initialData.role)
    }
  }, [isOpen, initialData])

  // Reset form when dialog closes
  const handleClose = () => {
    setName('')
    setGender('')
    setDescription('')
    setMbti('')
    setPortraitUrl('')
    setMetrics(INITIAL_METRICS)
    setInitialRole(undefined)
    onClose()
  }

  if (!isOpen) return null

  const handleGeneratePortrait = async () => {
    if (!description && !name) return
    setIsGeneratingPortrait(true)
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
          projectId: projectId, // Pass projectId for style references
          apiKey: apiKey,
        }),
      })
      const data = await res.json()
      if (data.url) {
        setPortraitUrl(data.url)
      }
    } catch (error) {
      console.error('Failed to generate portrait:', error)
    } finally {
      setIsGeneratingPortrait(false)
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

  const handleSubmit = () => {
    onCreate({
      name,
      gender,
      description,
      mbti,
      portraitUrl,
      ...metrics,
      role: initialRole || 'Supporting', // Use role from key player if available
      transformation: 0,
      characterPrompt: `You are ${name}. ${description}`,
    })
    handleClose()
  }

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-2xl rounded-lg shadow-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">
            {initialData ? 'Convert to Cast' : 'Create New Character'}
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
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Character Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Gender <span className="text-destructive">*</span>
              </label>
              <select
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                value={gender}
                onChange={e => setGender(e.target.value)}
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Description & Portrait */}
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium">
                Description <span className="text-destructive">*</span>
              </label>
              <textarea
                className="w-full h-32 bg-background border border-input rounded-md px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-primary focus:outline-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe appearance, personality, and background..."
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  MBTI <span className="text-destructive">*</span>
                </label>
                <select
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                  value={mbti}
                  onChange={e => setMbti(e.target.value)}
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
              </div>
            </div>

            {/* Portrait Area */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Portrait</label>
              <div className="aspect-square bg-secondary/30 rounded-lg border border-border border-dashed flex items-center justify-center relative overflow-hidden group">
                {portraitUrl ? (
                  <img src={portraitUrl} alt="Character" className="w-full h-full object-cover" />
                ) : (
                  <User className="text-muted-foreground/50 w-12 h-12" />
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="text-xs"
                    onClick={handleGeneratePortrait}
                    disabled={isGeneratingPortrait || (!description && !name)}
                  >
                    {isGeneratingPortrait ? (
                      <Loader2 className="animate-spin w-3 h-3 mr-1" />
                    ) : (
                      <Wand2 className="w-3 h-3 mr-1" />
                    )}
                    Generate
                  </Button>
                  {/* Placeholder for upload if needed */}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground text-center">
                Powered by Midjourney
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
                    onValueChange={([val]) => setMetrics(prev => ({ ...prev, valence: val - 100 }))}
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
                    onValueChange={([val]) => setMetrics(prev => ({ ...prev, socialSafety: val }))}
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
          <Button variant="default" onClick={handleSubmit} disabled={!name || !gender || !description || !mbti}>
            {initialData ? 'Convert to Cast' : 'Create Character'}
          </Button>
        </div>
      </div>
    </div>
  )
}
