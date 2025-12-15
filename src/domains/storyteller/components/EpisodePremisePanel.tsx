import React, { useState } from 'react'
import { Sparkles, Book, AlertCircle, Edit2, Save, X, Target, Zap, Skull, TrendingUp, Anchor, Image as ImageIcon } from 'lucide-react'
import { EpisodePremise } from '../schemas/agent-schemas'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface EpisodePremisePanelProps {
    premise: EpisodePremise | null
    globalBible: any // Read-only context
    posterUrl?: string | null
    posterPrompt?: string | null
    onUpdate: (updates: EpisodePremise) => void
    onGenerate: () => void
    onGeneratePoster?: () => void
    isGenerating?: boolean
    isGeneratingPoster?: boolean
    projectId: string
}

export const EpisodePremisePanel: React.FC<EpisodePremisePanelProps> = ({
    premise,
    globalBible,
    posterUrl,
    posterPrompt,
    onUpdate,
    onGenerate,
    onGeneratePoster,
    isGenerating = false,
    isGeneratingPoster = false,
    projectId
}) => {
    const [showBibleContext, setShowBibleContext] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [localPremise, setLocalPremise] = useState<Partial<EpisodePremise>>(premise || {})

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

    const handleChange = (field: keyof EpisodePremise, value: any) => {
        setLocalPremise(prev => ({ ...prev, [field]: value }))
    }

    if (!premise && !isEditing) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center h-full">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <Target className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">No Episode Premise</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                    This episode is a blank slate. Define the core conflict using the Ozymandias Framework: Hook, Flaw, Stakes, and Consequence.
                </p>
                <Button
                    onClick={onGenerate}
                    disabled={isGenerating}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 transition-all shadow-lg shadow-primary/25"
                >
                    <Sparkles className="w-5 h-5" />
                    {isGenerating ? 'Architecting Premise...' : 'Generate Ozymandias Premise'}
                </Button>
            </div>
        )
    }

    const fullPosterUrl = posterUrl
        ? (posterUrl.startsWith('http') ? posterUrl : `/projects/${projectId}/${posterUrl}`)
        : null

    return (
        <div className="flex h-full overflow-hidden">
            {/* Main Premise Content */}
            <div className="flex-1 overflow-y-auto p-8 relative">
                {/* Header covering Title & Poster */}
                <div className="flex gap-8 mb-8">
                    {/* Poster Section */}
                    <div className="w-48 flex-shrink-0">
                        <div className="aspect-[2/3] rounded-lg border border-border bg-muted/30 overflow-hidden relative group shadow-md hover:shadow-xl transition-all">
                            {/* Loading Shimmer */}
                            {isGeneratingPoster ? (
                                <Skeleton className="w-full h-full" />
                            ) : fullPosterUrl ? (
                                <>
                                    <img
                                        src={fullPosterUrl}
                                        alt="Episode Poster"
                                        className="w-full h-full object-cover"
                                    />
                                    {/* Overlay Action */}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
                                        {onGeneratePoster && (
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="w-full gap-2 text-xs"
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
                                </>
                            ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                                    <ImageIcon className="w-8 h-8 text-muted-foreground mb-2 opacity-50" />
                                    <p className="text-xs text-muted-foreground mb-3">No Poster</p>
                                    {onGeneratePoster && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="w-full gap-1 text-xs"
                                            onClick={onGeneratePoster}
                                        >
                                            <Sparkles className="w-3 h-3" /> Generate
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Title & Metadata */}
                    <div className="flex-1 pt-2">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                                    {localPremise.title || "Untitled Episode"}
                                </h2>
                                <div className="flex items-center gap-2 mt-3 text-muted-foreground">
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs font-bold uppercase tracking-wider">
                                        {localPremise.thematicFocus || "Theme Undefined"}
                                    </span>
                                    {localPremise.logline && (
                                        <span className="text-sm italic border-l-2 border-border pl-2">
                                            "{localPremise.logline}"
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 self-start">
                                <Button variant="ghost" size="sm" onClick={() => setShowBibleContext(!showBibleContext)} className="gap-2">
                                    <Book className="w-4 h-4" />
                                    {showBibleContext ? 'Hide Context' : 'View Bible'}
                                </Button>
                                {isEditing ? (
                                    <>
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
                                        <Button size="sm" onClick={handleSave} className="gap-2"><Save className="w-4 h-4" /> Save</Button>
                                    </>
                                ) : (
                                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-2">
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
                        <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                            <Anchor className="w-4 h-4" /> Protagonist Hook
                        </div>
                        {isEditing ? (
                            <textarea
                                className="w-full p-4 bg-muted/30 border border-border rounded-lg min-h-[120px] focus:ring-2 focus:ring-primary/50 outline-none"
                                value={localPremise.protagonistHook || ''}
                                onChange={e => handleChange('protagonistHook', e.target.value)}
                                placeholder="The opening situation..."
                            />
                        ) : (
                            <div className="p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                                <p className="text-foreground leading-relaxed">
                                    {localPremise.protagonistHook}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 2. FATAL FLAW */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-red-400 font-bold uppercase tracking-wider text-xs">
                            <Skull className="w-4 h-4" /> Fatal Flaw
                        </div>
                        {isEditing ? (
                            <textarea
                                className="w-full p-4 bg-red-500/5 border border-red-500/20 rounded-lg min-h-[120px] focus:ring-2 focus:ring-red-500/50 outline-none"
                                value={localPremise.fatalFlaw || ''}
                                onChange={e => handleChange('fatalFlaw', e.target.value)}
                                placeholder="The internal flaw driving the conflict..."
                            />
                        ) : (
                            <div className="p-6 bg-card border border-red-500/20 rounded-xl shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-8 -mt-8" />
                                <p className="text-foreground leading-relaxed relative z-10">
                                    {localPremise.fatalFlaw}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 3. STAKES */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-orange-400 font-bold uppercase tracking-wider text-xs">
                            <TrendingUp className="w-4 h-4" /> Stakes
                        </div>
                        {isEditing ? (
                            <textarea
                                className="w-full p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg min-h-[120px] focus:ring-2 focus:ring-orange-500/50 outline-none"
                                value={localPremise.stakes || ''}
                                onChange={e => handleChange('stakes', e.target.value)}
                                placeholder="What is strictly at risk..."
                            />
                        ) : (
                            <div className="p-6 bg-card border border-orange-500/20 rounded-xl shadow-sm">
                                <p className="text-foreground leading-relaxed">
                                    {localPremise.stakes}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* 4. INEVITABLE CONSEQUENCE (Transformation) */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2 text-purple-400 font-bold uppercase tracking-wider text-xs">
                            <Zap className="w-4 h-4" /> Inevitable Consequence
                        </div>
                        {isEditing ? (
                            <textarea
                                className="w-full p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg min-h-[120px] focus:ring-2 focus:ring-purple-500/50 outline-none"
                                value={localPremise.inevitableConsequence || ''}
                                onChange={e => handleChange('inevitableConsequence', e.target.value)}
                                placeholder="The irreversible change..."
                            />
                        ) : (
                            <div className="p-6 bg-card border border-purple-500/20 rounded-xl shadow-sm relative overflow-hidden">
                                <div className="absolute bottom-0 right-0 w-24 h-24 bg-purple-500/10 rounded-tl-full -mr-4 -mb-4" />
                                <p className="text-foreground leading-relaxed relative z-10">
                                    {localPremise.inevitableConsequence}
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
                            {globalBible.factions?.map((f: any, i: number) => (
                                <div key={i} className="text-xs p-2 bg-background border border-border rounded">
                                    <span className="font-bold block">{f.name}</span>
                                    <span className="opacity-70">{f.corePhilosophy}</span>
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
                            {globalBible.worldRules?.slice(0, 3).map((r: any, i: number) => (
                                <li key={i} className="text-xs text-muted-foreground">
                                    • {r.rule}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}

