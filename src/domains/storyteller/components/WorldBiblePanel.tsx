import { Music, Book, Film, Gamepad2, Save, Edit2, X, Sparkles, Zap, ScrollText, Crown, Users, RefreshCw, Star, Plus, Trash2 } from 'lucide-react'
import { useState, useEffect, useCallback } from 'react'
import { LocalStorageKeys } from '@/constants/localStorage'
import { useGlobalStatusStore } from '@/store/useGlobalStatusStore'
import { moodboardGenerationService } from '../services/MoodboardGenerationService'
import toast from 'react-hot-toast'

import { StoryPlan } from '../schemas/agent-schemas'
import { WorldRuleCard } from './WorldRuleCard'
import { FactionCard } from './FactionCard'

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

    // Get Comet API key (for Midjourney)
    const cometConfigStr = localStorage.getItem(LocalStorageKeys.AI_CONFIG_COMET)
    let cometKey = ''
    try {
        cometKey = cometConfigStr ? JSON.parse(cometConfigStr).apiKey : ''
    } catch {
        cometKey = cometConfigStr || ''
    }

    if (provider === 'nanobanana') {
        return {
            provider: 'nanobanana' as const,
            apiKey: geminiKey,
            modelId: localStorage.getItem('NANO_BANANA_MODEL_ID') || 'flux-pro'
        }
    } else {
        // Default to midjourney
        return {
            provider: 'midjourney' as const,
            apiKey: cometKey,
            modelId: 'midjourney'
        }
    }
}

interface WorldBiblePanelProps {
    storyPlan: StoryPlan
    onUpdate?: (updates: Partial<StoryPlan>) => void
    isReadOnly?: boolean
    onSendMessage?: (msg: string) => void
    projectId?: string
}

export const WorldBiblePanel: React.FC<WorldBiblePanelProps> = ({ storyPlan, onUpdate, isReadOnly = false, onSendMessage, projectId: propProjectId }) => {
    const rules = storyPlan.worldRules || []
    const factions = storyPlan.factions || []
    const characters = storyPlan.keyCharacters || []

    const [isEditing, setIsEditing] = useState(false)
    const [localPlan, setLocalPlan] = useState<Partial<StoryPlan>>({})
    const [primaryImageIndex, setPrimaryImageIndex] = useState<number | null>(null)

    // Get projectId from prop or URL
    const projectId = propProjectId || (typeof window !== 'undefined' ? window.location.pathname.split('/')[1] : '')

    // Derive generating state from global operations (same pattern as TileGenerationService)
    const operations = useGlobalStatusStore((state) => state.operations)
    const generatingIndices = new Set<number>()
    const prefix = `moodboard-gen-${projectId}`

    operations.forEach(op => {
        if (op.id === prefix) {
            // Full moodboard generation (all images)
            generatingIndices.add(0)
            generatingIndices.add(1)
            generatingIndices.add(2)
            generatingIndices.add(3)
        } else if (op.id.startsWith(prefix + '-')) {
            const suffix = op.id.replace(prefix + '-', '')
            const idx = parseInt(suffix)
            if (!isNaN(idx)) generatingIndices.add(idx)
        }
    })

    const isGenerating = generatingIndices.size > 0

    // Load primary image selection from localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && projectId) {
            const savedPrimary = localStorage.getItem(`moodboard-primary-${projectId}`)
            if (savedPrimary !== null) {
                const idx = parseInt(savedPrimary)
                if (!isNaN(idx)) setPrimaryImageIndex(idx)
            }
        }
    }, [projectId])

    useEffect(() => {
        setLocalPlan(storyPlan)
    }, [storyPlan])

    // Refetch project data and update moodboard images
    const refetchMoodboardData = useCallback(async () => {
        if (!projectId) return
        try {
            const response = await fetch(`/api/storyteller/projects/${projectId}`)
            if (!response.ok) return
            const data = await response.json()
            // API returns seriesBible (camelCase)
            const bible = data.seriesBible || data.series_bible
            if (bible?.moodImages && onUpdate) {
                console.log('📥 Refetched moodImages:', bible.moodImages)
                onUpdate({ moodImages: bible.moodImages })
            }
        } catch (error) {
            console.error('Failed to refetch moodboard data:', error)
        }
    }, [projectId, onUpdate])

    // Listen for moodboard generation completion events
    useEffect(() => {
        const handleMoodboardComplete = (event: CustomEvent) => {
            if (event.detail?.projectId === projectId) {
                console.log('🖼️ Moodboard generation complete, refetching data...')
                refetchMoodboardData()
            }
        }

        window.addEventListener('moodboard-generation-complete', handleMoodboardComplete as EventListener)
        return () => {
            window.removeEventListener('moodboard-generation-complete', handleMoodboardComplete as EventListener)
        }
    }, [projectId, refetchMoodboardData])

    // Save primary image selection to localStorage
    const handleSetPrimaryImage = (index: number) => {
        const newIndex = primaryImageIndex === index ? null : index
        setPrimaryImageIndex(newIndex)
        if (typeof window !== 'undefined' && projectId) {
            if (newIndex !== null) {
                localStorage.setItem(`moodboard-primary-${projectId}`, newIndex.toString())
            } else {
                localStorage.removeItem(`moodboard-primary-${projectId}`)
            }
            // Dispatch event to update background in parent
            window.dispatchEvent(new CustomEvent('moodboard-primary-changed'))
        }
    }

    // Get primary image URL for background
    const primaryImageUrl = primaryImageIndex !== null && storyPlan.moodImages?.[primaryImageIndex]
        ? `/projects/${projectId}/${storyPlan.moodImages[primaryImageIndex]}`
        : null

    const handleSave = () => {
        if (onUpdate) {
            onUpdate(localPlan)
        }
        setIsEditing(false)
    }

    const handleChange = (field: keyof StoryPlan, value: any) => {
        setLocalPlan(prev => ({ ...prev, [field]: value }))
    }

    const handleInspirationChange = (category: 'books' | 'movies' | 'games', value: string) => {
        const current = localPlan.inspirations || { books: [], movies: [], games: [] }
        const list = value.split(',').map(s => s.trim()).filter(Boolean)
        setLocalPlan(prev => ({
            ...prev,
            inspirations: {
                ...current,
                [category]: list
            }
        }))
    }

    // World Rules handlers
    const handleWorldRuleChange = (index: number, field: string, value: any) => {
        const rules = [...(localPlan.worldRules || [])]
        rules[index] = { ...rules[index], [field]: value }
        setLocalPlan(prev => ({ ...prev, worldRules: rules }))
    }

    const handleAddWorldRule = () => {
        const rules = [...(localPlan.worldRules || [])]
        rules.push({ category: 'Physics', rule: '', consequence: '', exceptions: null })
        setLocalPlan(prev => ({ ...prev, worldRules: rules }))
    }

    const handleRemoveWorldRule = (index: number) => {
        const rules = [...(localPlan.worldRules || [])]
        rules.splice(index, 1)
        setLocalPlan(prev => ({ ...prev, worldRules: rules }))
    }

    // Factions handlers
    const handleFactionChange = (index: number, field: string, value: any) => {
        const factions = [...(localPlan.factions || [])]
        factions[index] = { ...factions[index], [field]: value }
        setLocalPlan(prev => ({ ...prev, factions }))
    }

    const handleAddFaction = () => {
        const factions = [...(localPlan.factions || [])]
        factions.push({ id: `faction-${Date.now()}`, name: '', ideology: '', goals: [], resources: '', weaknesses: null, rivals: null })
        setLocalPlan(prev => ({ ...prev, factions }))
    }

    const handleRemoveFaction = (index: number) => {
        const factions = [...(localPlan.factions || [])]
        factions.splice(index, 1)
        setLocalPlan(prev => ({ ...prev, factions }))
    }

    // Plot Twists handlers
    const handlePlotTwistChange = (index: number, value: string) => {
        const twists = [...(localPlan.plotTwists || [])]
        twists[index] = value
        setLocalPlan(prev => ({ ...prev, plotTwists: twists }))
    }

    const handleAddPlotTwist = () => {
        const twists = [...(localPlan.plotTwists || [])]
        twists.push('')
        setLocalPlan(prev => ({ ...prev, plotTwists: twists }))
    }

    const handleRemovePlotTwist = (index: number) => {
        const twists = [...(localPlan.plotTwists || [])]
        twists.splice(index, 1)
        setLocalPlan(prev => ({ ...prev, plotTwists: twists }))
    }

    // Sequences (Episode Roadmap) handlers
    const handleSequenceChange = (index: number, field: string, value: any) => {
        const sequences = [...(localPlan.sequences || [])]
        sequences[index] = { ...sequences[index], [field]: value }
        setLocalPlan(prev => ({ ...prev, sequences }))
    }

    const handleAddSequence = () => {
        const sequences = [...(localPlan.sequences || [])]
        const newId = sequences.length > 0 ? Math.max(...sequences.map(s => s.id)) + 1 : 1
        sequences.push({ id: newId, name: '', description: '', keyFactionsInvolved: [], worldConsequence: '' })
        setLocalPlan(prev => ({ ...prev, sequences }))
    }

    const handleRemoveSequence = (index: number) => {
        const sequences = [...(localPlan.sequences || [])]
        sequences.splice(index, 1)
        setLocalPlan(prev => ({ ...prev, sequences }))
    }

    // Key Characters handlers
    const handleKeyCharacterChange = (index: number, field: string, value: any) => {
        const chars = [...(localPlan.keyCharacters || [])]
        chars[index] = { ...chars[index], [field]: value }
        setLocalPlan(prev => ({ ...prev, keyCharacters: chars }))
    }

    const handleAddKeyCharacter = () => {
        const chars = [...(localPlan.keyCharacters || [])]
        chars.push({ name: '', role: '', archetype: '', motivation: '', factionId: null })
        setLocalPlan(prev => ({ ...prev, keyCharacters: chars }))
    }

    const handleRemoveKeyCharacter = (index: number) => {
        const chars = [...(localPlan.keyCharacters || [])]
        chars.splice(index, 1)
        setLocalPlan(prev => ({ ...prev, keyCharacters: chars }))
    }

    // Backwards compatibility for old "protagonist" field
    if (storyPlan.protagonist && !characters.find(c => c.name === storyPlan.protagonist?.name)) {
        characters.push({
            name: storyPlan.protagonist.name,
            role: 'Protagonist',
            archetype: 'Hero',
            motivation: storyPlan.protagonist.want,
        })
    }

    return (
        <div className="h-full pr-2 relative">
            {!isReadOnly && onUpdate && (
                <div className="absolute top-0 right-0 z-10">
                    {isEditing ? (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false)
                                    setLocalPlan(storyPlan)
                                }}
                                className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                                title="Cancel"
                            >
                                <X size={16} />
                            </button>
                            <button
                                onClick={handleSave}
                                className="p-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full transition-colors"
                                title="Save Changes"
                            >
                                <Save size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-2 bg-muted hover:bg-muted/80 rounded-full transition-colors"
                            title="Edit Bible"
                        >
                            <Edit2 size={16} />
                        </button>
                    )}
                </div>
            )}

            <div className="space-y-8">

                {/* WORLD DESCRIPTION */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-400" />
                            <h3 className="font-bold text-lg">World Bible</h3>
                        </div>
                        {!isReadOnly && onSendMessage && (
                            <button
                                onClick={() => onSendMessage("Generate a rich world description including setting, atmosphere, and key details.")}
                                className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                title="Generate World Description"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>
                    {isEditing ? (
                        <textarea
                            className="w-full h-32 p-3 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                            value={localPlan.worldDescription || ''}
                            onChange={(e) => handleChange('worldDescription', e.target.value)}
                            placeholder="Describe the world..."
                        />
                    ) : (
                        <div className="p-4 bg-muted/20 border border-border rounded-lg text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {storyPlan.worldDescription || <span className="text-muted-foreground italic">No world description available.</span>}
                        </div>
                    )}
                </section>

                {/* MOODBOARD SECTION */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-pink-400" />
                            <h3 className="font-bold text-lg">Moodboard</h3>
                        </div>
                        {isEditing && (
                            <div className="flex gap-2">
                                <button
                                    onClick={async () => {
                                        if (isGenerating) return
                                        if (!storyPlan.worldDescription) {
                                            toast.error("Please add a world description first.")
                                            return
                                        }
                                        const config = getProviderConfig()
                                        if (!config.apiKey) {
                                            toast.error(`Missing API key for ${config.provider}. Please configure in Settings.`)
                                            return
                                        }
                                        try {
                                            await moodboardGenerationService.generate(
                                                projectId,
                                                [], // Prompts are generated on backend
                                                undefined, // Style ref handled on backend
                                                config,
                                                refetchMoodboardData
                                            )
                                        } catch (e) {
                                            console.error(e)
                                            toast.error("Error starting generation")
                                        }
                                    }}
                                    disabled={isGenerating}
                                    className={`p-1.5 rounded-md transition-colors ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'text-white hover:bg-white/10'}`}
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
                                const imgProjectId = location.pathname.split('/')[1]
                                const isPrimary = primaryImageIndex === i
                                return (
                                    <div key={i} className={`aspect-square rounded-lg overflow-hidden border relative group ${isPrimary ? 'border-yellow-400 border-2' : 'border-border'}`}>
                                        <img
                                            src={`/projects/${imgProjectId}/${img}`}
                                            alt={`Mood ${i + 1}`}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                            onClick={() => window.open(`/projects/${imgProjectId}/${img}`, '_blank')}
                                        />
                                        {/* Primary indicator */}
                                        {isPrimary && (
                                            <div className="absolute top-1 left-1 z-20">
                                                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                            </div>
                                        )}
                                        {/* Loading overlay */}
                                        {generatingIndices.has(i) && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                                                <Sparkles className="w-8 h-8 text-pink-400 animate-spin" />
                                            </div>
                                        )}
                                        <div className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 ${generatingIndices.has(i) ? 'hidden' : ''}`}>
                                            {/* Set as Primary Button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleSetPrimaryImage(i)
                                                }}
                                                className={`p-2 rounded-full transition-colors ${isPrimary ? 'bg-yellow-400 text-black' : 'bg-white/80 hover:bg-yellow-400 text-gray-700'}`}
                                                title={isPrimary ? "Remove as primary" : "Set as primary background"}
                                            >
                                                <Star size={16} className={isPrimary ? 'fill-current' : ''} />
                                            </button>
                                            {/* Regenerate Button */}
                                            {!isReadOnly && (
                                                <button
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        if (generatingIndices.has(i)) return
                                                        const config = getProviderConfig()
                                                        if (!config.apiKey) {
                                                            toast.error(`Missing API key for ${config.provider}. Please configure in Settings.`)
                                                            return
                                                        }
                                                        try {
                                                            await moodboardGenerationService.generate(
                                                                projectId,
                                                                [],
                                                                undefined,
                                                                config,
                                                                refetchMoodboardData,
                                                                i // promptIndex for single image regeneration
                                                            )
                                                        } catch (err) {
                                                            console.error(err)
                                                            toast.error("Error starting regeneration")
                                                        }
                                                    }}
                                                    disabled={generatingIndices.has(i)}
                                                    className={`p-2 rounded-full text-white transition-colors ${generatingIndices.has(i) ? 'bg-pink-500/50 cursor-not-allowed' : 'bg-pink-500/80 hover:bg-pink-500'}`}
                                                    title="Regenerate"
                                                >
                                                    <Sparkles size={16} className={generatingIndices.has(i) ? 'animate-spin' : ''} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic mb-4">
                            No mood visuals generated yet.
                        </div>
                    )}
                </section>

                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Music className="w-5 h-5 text-blue-400" />
                            <h3 className="font-bold text-lg">Atmosphere & Soundtrack</h3>
                        </div>
                        {!isReadOnly && onSendMessage && (
                            <button
                                onClick={() => onSendMessage("Suggest a unique musical atmosphere and specific soundtrack recommendations for this world that reinforce its tone.")}
                                className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                title="Generate Soundtrack"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>

                    {isEditing ? (
                        <input
                            type="text"
                            className="w-full p-2 bg-background border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary outline-none"
                            value={localPlan.moodSoundtrack || ''}
                            onChange={(e) => handleChange('moodSoundtrack', e.target.value)}
                            placeholder="Link to soundtrack or describe the mood music..."
                        />
                    ) : (
                        <div className="flex items-center gap-3 p-3 bg-muted/20 border border-border rounded-lg">
                            <div className="bg-pink-500/10 p-2 rounded-full">
                                <Music className="w-4 h-4 text-pink-500" />
                            </div>
                            <span className="text-sm font-medium">
                                {storyPlan.moodSoundtrack || <span className="text-muted-foreground italic font-normal">No soundtrack defined.</span>}
                            </span>
                        </div>
                    )}
                </section>

                {/* INSPIRATIONS */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-cyan-400" />
                            <h3 className="font-bold text-lg">Inspirations</h3>
                        </div>
                        {!isReadOnly && onSendMessage && (
                            <button
                                onClick={() => onSendMessage("Generate diverse inspirations for this world - include relevant books, movies, and games that capture similar themes, atmosphere, or world-building elements.")}
                                className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                title="Generate Inspirations"
                            >
                                <RefreshCw size={14} />
                            </button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* BOOKS */}
                        <div className="p-4 bg-muted/10 border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-3 text-cyan-400 font-semibold text-sm">
                                <Book className="w-4 h-4" /> Books
                            </div>
                            {isEditing ? (
                                <textarea
                                    className="w-full h-20 p-2 bg-background border border-border rounded text-xs resize-none"
                                    placeholder="Comma separated..."
                                    value={localPlan.inspirations?.books?.join(', ') || ''}
                                    onChange={(e) => handleInspirationChange('books', e.target.value)}
                                />
                            ) : (
                                <div className="space-y-1">
                                    {storyPlan.inspirations?.books?.length ? (
                                        storyPlan.inspirations.books.map((item, i) => (
                                            <div key={i} className="text-xs text-muted-foreground">• {item}</div>
                                        ))
                                    ) : <div className="text-xs text-muted-foreground italic">None</div>}
                                </div>
                            )}
                        </div>

                        {/* MOVIES */}
                        <div className="p-4 bg-muted/10 border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-3 text-cyan-400 font-semibold text-sm">
                                <Film className="w-4 h-4" /> Movies
                            </div>
                            {isEditing ? (
                                <textarea
                                    className="w-full h-20 p-2 bg-background border border-border rounded text-xs resize-none"
                                    placeholder="Comma separated..."
                                    value={localPlan.inspirations?.movies?.join(', ') || ''}
                                    onChange={(e) => handleInspirationChange('movies', e.target.value)}
                                />
                            ) : (
                                <div className="space-y-1">
                                    {storyPlan.inspirations?.movies?.length ? (
                                        storyPlan.inspirations.movies.map((item, i) => (
                                            <div key={i} className="text-xs text-muted-foreground">• {item}</div>
                                        ))
                                    ) : <div className="text-xs text-muted-foreground italic">None</div>}
                                </div>
                            )}
                        </div>

                        {/* GAMES */}
                        <div className="p-4 bg-muted/10 border border-border rounded-lg">
                            <div className="flex items-center gap-2 mb-3 text-cyan-400 font-semibold text-sm">
                                <Gamepad2 className="w-4 h-4" /> Games
                            </div>
                            {isEditing ? (
                                <textarea
                                    className="w-full h-20 p-2 bg-background border border-border rounded text-xs resize-none"
                                    placeholder="Comma separated..."
                                    value={localPlan.inspirations?.games?.join(', ') || ''}
                                    onChange={(e) => handleInspirationChange('games', e.target.value)}
                                />
                            ) : (
                                <div className="space-y-1">
                                    {storyPlan.inspirations?.games?.length ? (
                                        storyPlan.inspirations.games.map((item, i) => (
                                            <div key={i} className="text-xs text-muted-foreground">• {item}</div>
                                        ))
                                    ) : <div className="text-xs text-muted-foreground italic">None</div>}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* WORLD RULES SECTION */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <ScrollText className="w-5 h-5 text-purple-400" />
                            <h3 className="font-bold text-lg">The Laws of the World</h3>
                        </div>
                        <div className="flex gap-2">
                            {isEditing && (
                                <button
                                    onClick={handleAddWorldRule}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Add World Rule"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                            {!isReadOnly && onSendMessage && (
                                <button
                                    onClick={() => onSendMessage("Generate the fundamental laws and rules that govern this world - magic systems, physics, social contracts, etc.")}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Generate World Rules"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4">
                            {(localPlan.worldRules || []).length === 0 ? (
                                <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                                    No world rules defined. Click + to add one.
                                </div>
                            ) : (
                                (localPlan.worldRules || []).map((rule, idx) => (
                                    <div key={idx} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                                        <div className="flex items-start justify-between">
                                            <select
                                                className="p-2 bg-background border border-border rounded text-sm"
                                                value={rule.category}
                                                onChange={(e) => handleWorldRuleChange(idx, 'category', e.target.value)}
                                            >
                                                {['Physics', 'Magic', 'Technology', 'Society', 'Politics', 'Economics'].map(cat => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => handleRemoveWorldRule(idx)}
                                                className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                                                title="Remove Rule"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="The rule..."
                                            value={rule.rule || ''}
                                            onChange={(e) => handleWorldRuleChange(idx, 'rule', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="Consequence if broken..."
                                            value={rule.consequence || ''}
                                            onChange={(e) => handleWorldRuleChange(idx, 'consequence', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="Exceptions (optional)..."
                                            value={rule.exceptions || ''}
                                            onChange={(e) => handleWorldRuleChange(idx, 'exceptions', e.target.value || null)}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    ) : rules.length === 0 ? (
                        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                            No world rules defined yet. The laws of nature (or magic) are unspoken.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {rules.map((rule, idx) => (
                                <WorldRuleCard key={idx} rule={rule as any} />
                            ))}
                        </div>
                    )}
                </section>

                {/* FACTIONS SECTION */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Crown className="w-5 h-5 text-orange-400" />
                            <h3 className="font-bold text-lg">Power & Factions</h3>
                        </div>
                        <div className="flex gap-2">
                            {isEditing && (
                                <button
                                    onClick={handleAddFaction}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Add Faction"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                            {!isReadOnly && onSendMessage && (
                                <button
                                    onClick={() => onSendMessage("Generate the major factions, power structures, and political forces in this world.")}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Generate Factions"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>

                    {isEditing ? (
                        <div className="space-y-4">
                            {(localPlan.factions || []).length === 0 ? (
                                <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                                    No factions defined. Click + to add one.
                                </div>
                            ) : (
                                (localPlan.factions || []).map((faction, idx) => (
                                    <div key={idx} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                                        <div className="flex items-center justify-between">
                                            <input
                                                type="text"
                                                className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
                                                placeholder="Faction Name..."
                                                value={faction.name || ''}
                                                onChange={(e) => handleFactionChange(idx, 'name', e.target.value)}
                                            />
                                            <button
                                                onClick={() => handleRemoveFaction(idx)}
                                                className="ml-2 p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                                                title="Remove Faction"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <textarea
                                            className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-16"
                                            placeholder="Ideology / Core belief..."
                                            value={faction.ideology || ''}
                                            onChange={(e) => handleFactionChange(idx, 'ideology', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="Goals (comma separated)..."
                                            value={(faction.goals || []).join(', ')}
                                            onChange={(e) => handleFactionChange(idx, 'goals', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                        />
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="Resources / Power..."
                                            value={faction.resources || ''}
                                            onChange={(e) => handleFactionChange(idx, 'resources', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="Weaknesses (optional)..."
                                            value={faction.weaknesses || ''}
                                            onChange={(e) => handleFactionChange(idx, 'weaknesses', e.target.value || null)}
                                        />
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="Rivals (comma separated, optional)..."
                                            value={(faction.rivals || []).join(', ')}
                                            onChange={(e) => handleFactionChange(idx, 'rivals', e.target.value ? e.target.value.split(',').map(s => s.trim()).filter(Boolean) : null)}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    ) : factions.length === 0 ? (
                        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                            No factions defined. Power is a vacuum.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {factions.map((faction, idx) => (
                                <FactionCard key={idx} faction={faction as any} />
                            ))}
                        </div>
                    )}
                </section>

                {/* PLOT TWISTS SECTION */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-red-400" />
                            <h3 className="font-bold text-lg">Plot Twists</h3>
                        </div>
                        <div className="flex gap-2">
                            {isEditing && (
                                <button
                                    onClick={handleAddPlotTwist}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Add Plot Twist"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                            {!isReadOnly && onSendMessage && (
                                <button
                                    onClick={() => onSendMessage("Generate 3 major plot twists for this story.")}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Generate Twists"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-2">
                            {(localPlan.plotTwists || []).length === 0 ? (
                                <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                                    No plot twists defined. Click + to add one.
                                </div>
                            ) : (
                                (localPlan.plotTwists || []).map((twist, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <span className="text-muted-foreground text-sm">{i + 1}.</span>
                                        <input
                                            type="text"
                                            className="flex-1 p-2 bg-background border border-border rounded text-sm"
                                            placeholder="Describe the plot twist..."
                                            value={twist}
                                            onChange={(e) => handlePlotTwistChange(i, e.target.value)}
                                        />
                                        <button
                                            onClick={() => handleRemovePlotTwist(i)}
                                            className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                                            title="Remove Twist"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : storyPlan.plotTwists && storyPlan.plotTwists.length > 0 ? (
                        <ul className="list-disc pl-5 space-y-2">
                            {storyPlan.plotTwists.map((twist, i) => (
                                <li key={i} className="text-sm text-muted-foreground">{twist}</li>
                            ))}
                        </ul>
                    ) : (
                        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                            No plot twists revealed yet.
                        </div>
                    )}
                </section>

                {/* EPISODE ROADMAP SECTION */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Film className="w-5 h-5 text-green-400" />
                            <h3 className="font-bold text-lg">Episode Roadmap</h3>
                        </div>
                        <div className="flex gap-2">
                            {isEditing && (
                                <button
                                    onClick={handleAddSequence}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Add Episode"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                            {!isReadOnly && onSendMessage && (
                                <button
                                    onClick={() => onSendMessage("Create an episode breakdown for this season.")}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Generate Roadmap"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-4">
                            {(localPlan.sequences || []).length === 0 ? (
                                <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                                    No episodes defined. Click + to add one.
                                </div>
                            ) : (
                                (localPlan.sequences || []).map((seq, i) => (
                                    <div key={i} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-mono text-xs text-primary/70">Episode {i + 1}</span>
                                            <button
                                                onClick={() => handleRemoveSequence(i)}
                                                className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                                                title="Remove Episode"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm font-bold"
                                            placeholder="Episode Name..."
                                            value={seq.name || ''}
                                            onChange={(e) => handleSequenceChange(i, 'name', e.target.value)}
                                        />
                                        <textarea
                                            className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-20"
                                            placeholder="Episode description..."
                                            value={seq.description || ''}
                                            onChange={(e) => handleSequenceChange(i, 'description', e.target.value)}
                                        />
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="Key factions involved (comma separated)..."
                                            value={(seq.keyFactionsInvolved || []).join(', ')}
                                            onChange={(e) => handleSequenceChange(i, 'keyFactionsInvolved', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                        />
                                        <input
                                            type="text"
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            placeholder="World consequence (how the world changes after)..."
                                            value={seq.worldConsequence || ''}
                                            onChange={(e) => handleSequenceChange(i, 'worldConsequence', e.target.value)}
                                        />
                                    </div>
                                ))
                            )}
                        </div>
                    ) : storyPlan.sequences && storyPlan.sequences.length > 0 ? (
                        <div className="space-y-4">
                            {storyPlan.sequences.map((seq, i) => (
                                <div key={i} className="p-3 bg-muted/20 border border-border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-xs text-primary/70">Episode {i + 1}</span>
                                        <span className="font-bold text-sm">{seq.name}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{seq.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                            No episode roadmap defined.
                        </div>
                    )}
                </section>

                {/* CHARACTERS SECTION */}
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" />
                            <h3 className="font-bold text-lg">Key Players</h3>
                        </div>
                        <div className="flex gap-2">
                            {isEditing && (
                                <button
                                    onClick={handleAddKeyCharacter}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Add Character"
                                >
                                    <Plus size={14} />
                                </button>
                            )}
                            {!isReadOnly && onSendMessage && (
                                <button
                                    onClick={() => onSendMessage("Generate key characters for this story - protagonists, antagonists, and supporting cast with their motivations and roles.")}
                                    className="p-1.5 rounded-md transition-colors text-white hover:bg-white/10"
                                    title="Generate Key Players"
                                >
                                    <RefreshCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                    {isEditing ? (
                        <div className="space-y-4">
                            {(localPlan.keyCharacters || []).length === 0 ? (
                                <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                                    No key characters defined. Click + to add one.
                                </div>
                            ) : (
                                (localPlan.keyCharacters || []).map((char, idx) => (
                                    <div key={idx} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                                        <div className="flex items-center justify-between gap-2">
                                            <input
                                                type="text"
                                                className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
                                                placeholder="Character Name..."
                                                value={char.name || ''}
                                                onChange={(e) => handleKeyCharacterChange(idx, 'name', e.target.value)}
                                            />
                                            <button
                                                onClick={() => handleRemoveKeyCharacter(idx)}
                                                className="p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                                                title="Remove Character"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <input
                                                type="text"
                                                className="w-full p-2 bg-background border border-border rounded text-sm"
                                                placeholder="Role (e.g. Protagonist, Antagonist)..."
                                                value={char.role || ''}
                                                onChange={(e) => handleKeyCharacterChange(idx, 'role', e.target.value)}
                                            />
                                            <input
                                                type="text"
                                                className="w-full p-2 bg-background border border-border rounded text-sm"
                                                placeholder="Archetype (e.g. Hero, Trickster)..."
                                                value={char.archetype || ''}
                                                onChange={(e) => handleKeyCharacterChange(idx, 'archetype', e.target.value)}
                                            />
                                        </div>
                                        <textarea
                                            className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-16"
                                            placeholder="Motivation - what drives this character..."
                                            value={char.motivation || ''}
                                            onChange={(e) => handleKeyCharacterChange(idx, 'motivation', e.target.value)}
                                        />
                                        <select
                                            className="w-full p-2 bg-background border border-border rounded text-sm"
                                            value={char.factionId || ''}
                                            onChange={(e) => handleKeyCharacterChange(idx, 'factionId', e.target.value || null)}
                                        >
                                            <option value="">No faction alignment</option>
                                            {(localPlan.factions || factions).map((f: any) => (
                                                <option key={f.id} value={f.id}>{f.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {characters.length === 0 ? (
                                <div className="col-span-full p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                                    No key characters defined yet.
                                </div>
                            ) : (
                                characters.map((char, idx) => (
                                    <div key={idx} className="p-4 rounded-lg bg-muted/20 border border-border">
                                        <div className="font-bold mb-1 flex items-center justify-between">
                                            {char.name}
                                            <span className="text-[10px] uppercase bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                                {char.role}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground italic mb-2">
                                            "{char.archetype}"
                                        </div>
                                        <div className="text-xs">
                                            <span className="font-semibold text-muted-foreground">Motivation: </span>
                                            {char.motivation}
                                        </div>
                                        {char.factionId && (
                                            <div className="mt-2 pt-2 border-t border-border/50 text-[10px] text-orange-400 flex items-center gap-1">
                                                <Zap className="w-3 h-3" />
                                                Aligned with {factions.find((f: any) => f.id === char.factionId)?.name || 'Unknown Faction'}
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </section>

            </div>
        </div >
    )
}
