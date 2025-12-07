import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { X, Wand2, Upload, User, Loader2 } from 'lucide-react'
import { LocalStorageKeys } from '@/constants/localStorage'

interface CharacterCreationDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (character: any) => void
  projectId?: string // Optional: for project-scoped style references
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
}) => {
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [description, setDescription] = useState('')
  const [mbti, setMbti] = useState('')
  const [portraitUrl, setPortraitUrl] = useState('')
  const [metrics, setMetrics] = useState(INITIAL_METRICS)

  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false)
  const [isGeneratingMetrics, setIsGeneratingMetrics] = useState(false)

  if (!isOpen) return null

  const handleGeneratePortrait = async () => {
    if (!description && !name) return
    setIsGeneratingPortrait(true)
    try {
      // Get Comet API key from localStorage
      let cometApiKey = ''
      const savedComet = localStorage.getItem(LocalStorageKeys.AI_CONFIG_COMET)
      if (savedComet) {
        const cometConfig = JSON.parse(savedComet)
        cometApiKey = cometConfig.apiKey || ''
      }

      const res = await fetch('/api/storyteller/generate-portrait', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: description || `A portrait of ${name}, ${gender}`,
          projectId: projectId, // Pass projectId for style references
          apiKey: cometApiKey,
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
      role: 'Supporting', // Default
      transformation: 0,
      characterPrompt: `You are ${name}. ${description}`,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="bg-card border border-border w-full max-w-2xl rounded-lg shadow-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-bold">Create New Character</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
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
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
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
                className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
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
                className="w-full h-32 bg-background border border-border rounded px-3 py-2 text-sm resize-none"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe appearance, personality, and background..."
              />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    MBTI <span className="text-destructive">*</span>
                  </label>
                  <input
                    className="w-full bg-background border border-border rounded px-3 py-2 text-sm"
                    value={mbti}
                    onChange={e => setMbti(e.target.value)}
                    placeholder="e.g. INTJ"
                  />
                </div>
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
                    variant="secondary"
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
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name || !gender || !description || !mbti}>
            Create Character
          </Button>
        </div>
      </div>
    </div>
  )
}
