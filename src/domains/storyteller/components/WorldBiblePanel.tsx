import { Music, Book, Film, Gamepad2, Save, Edit2, X, Sparkles, Zap, ScrollText, Crown, Users } from 'lucide-react'
import { useState, useEffect } from 'react'

import { StoryPlan } from '../schemas/agent-schemas'
import { WorldRuleCard } from './WorldRuleCard'
import { FactionCard } from './FactionCard'

interface WorldBiblePanelProps {
    storyPlan: StoryPlan
    onUpdate?: (updates: Partial<StoryPlan>) => void
    isReadOnly?: boolean
    onSendMessage?: (msg: string) => void
}

export const WorldBiblePanel: React.FC<WorldBiblePanelProps> = ({ storyPlan, onUpdate, isReadOnly = false, onSendMessage }) => {
    const rules = storyPlan.worldRules || []
    const factions = storyPlan.factions || []
    const characters = storyPlan.keyCharacters || []

    const [isEditing, setIsEditing] = useState(false)
    const [localPlan, setLocalPlan] = useState<Partial<StoryPlan>>({})

    useEffect(() => {
        setLocalPlan(storyPlan)
    }, [storyPlan])

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
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-5 h-5 text-yellow-400" />
                        <h3 className="font-bold text-lg">World Bible</h3>
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
                                        if (!storyPlan.worldDescription) {
                                            alert("Please add a world description first.")
                                            return
                                        }
                                        try {
                                            const res = await fetch('/api/storyteller/moodboard/trigger', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    projectId: location.pathname.split('/').pop(),
                                                    worldDescription: storyPlan.worldDescription
                                                })
                                            })
                                            if (res.ok) alert("Moodboard generation started! Check back in a few minutes.")
                                            else alert("Failed to start generation")
                                        } catch (e) {
                                            console.error(e)
                                            alert("Error starting generation")
                                        }
                                    }}
                                    className="px-3 py-1 text-xs bg-pink-500/20 text-pink-400 hover:bg-pink-500/30 border border-pink-500/50 rounded flex items-center gap-1 transition-colors"
                                >
                                    <Sparkles size={12} />
                                    Generate Moodboard
                                </button>
                            </div>
                        )}
                    </div>

                    {storyPlan.moodImages && storyPlan.moodImages.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            {storyPlan.moodImages.map((img, i) => (
                                <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border relative group">
                                    <img
                                        src={`/projects/${location.pathname.split('/').pop()}/${img}`}
                                        alt={`Mood ${i + 1}`}
                                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button
                                            onClick={() => window.open(`/projects/${location.pathname.split('/').pop()}/${img}`, '_blank')}
                                            className="p-1 bg-background/80 rounded-full text-foreground hover:bg-background"
                                        >
                                            <Zap size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic mb-4">
                            No mood visuals generated yet.
                        </div>
                    )}
                </section>

                {/* ATMOSPHERE & SOUNDTRACK */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <Music className="w-5 h-5 text-blue-400" />
                        <h3 className="font-bold text-lg">Atmosphere & Soundtrack</h3>
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
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-cyan-400" />
                        <h3 className="font-bold text-lg">Inspirations</h3>
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
                    <div className="flex items-center gap-2 mb-4">
                        <ScrollText className="w-5 h-5 text-purple-400" />
                        <h3 className="font-bold text-lg">The Laws of the World</h3>
                    </div>

                    {rules.length === 0 ? (
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
                    <div className="flex items-center gap-2 mb-4">
                        <Crown className="w-5 h-5 text-orange-400" />
                        <h3 className="font-bold text-lg">Power & Factions</h3>
                    </div>

                    {factions.length === 0 ? (
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
                        {!isReadOnly && onSendMessage && (
                            <button
                                onClick={() => onSendMessage("Generate 3 major plot twists for this story.")}
                                className="px-3 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 rounded flex items-center gap-1 transition-colors"
                            >
                                <Sparkles size={12} />
                                Generate Twists
                            </button>
                        )}
                    </div>
                    {storyPlan.plotTwists && storyPlan.plotTwists.length > 0 ? (
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
                        {!isReadOnly && onSendMessage && (
                            <button
                                onClick={() => onSendMessage("Create an episode breakdown for this season.")}
                                className="px-3 py-1 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/50 rounded flex items-center gap-1 transition-colors"
                            >
                                <Sparkles size={12} />
                                Generate Roadmap
                            </button>
                        )}
                    </div>
                    {storyPlan.sequences && storyPlan.sequences.length > 0 ? (
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
                    <div className="flex items-center gap-2 mb-4">
                        <Users className="w-5 h-5 text-blue-400" />
                        <h3 className="font-bold text-lg">Key Players</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {characters.map((char, idx) => (
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
                        ))}
                    </div>
                </section>

            </div>
        </div >
    )
}
