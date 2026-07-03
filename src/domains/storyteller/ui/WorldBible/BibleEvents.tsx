import React from 'react'
import { Plus, RefreshCw, Trash2, Loader2, CalendarHeart } from 'lucide-react'
import { useBible } from './BibleContext'
import { SectionPendingOverlay } from './SectionPendingOverlay'
import { RichText } from '../RichText'

export const BibleEvents: React.FC = () => {
    const {
        storyPlan,
        isEditing,
        localPlan,
        updateEvent,
        addEvent,
        removeEvent,
        isReadOnly,
        onSendMessage,
        loadingSections,
        pendingActions,
        projectId,
    } = useBible()

    // Use localPlan for display when not editing to show latest saved data
    const displayEvents = isEditing
        ? (localPlan.events || [])
        : (localPlan.events || storyPlan.events || [])
    const isLoading = loadingSections?.events?.loading ?? false
    const pendingAction = pendingActions?.events

    return (
        <section className={isLoading || pendingAction ? 'relative' : ''}>
            {/* Pending action overlay */}
            {pendingAction && (
                <SectionPendingOverlay pendingAction={pendingAction} onReview={pendingAction.onReview} />
            )}
            {isLoading && !pendingAction && (
                <div className="absolute inset-0 z-10 bg-background/60 backdrop-blur-sm rounded-lg flex items-center justify-center">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                        <span>Pacing history...</span>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <CalendarHeart className="w-5 h-5 text-rose-500/80" />
                    <h3 className="font-syne font-bold text-lg">Historical Events</h3>
                </div>
                <div className="flex gap-2">
                    {isEditing && (
                        <button
                            onClick={addEvent}
                            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''
                                }`}
                            title="Add Event"
                            disabled={isLoading}
                        >
                            <Plus size={14} />
                        </button>
                    )}
                    {!isReadOnly && onSendMessage && (
                        <button
                            onClick={() =>
                                onSendMessage?.(
                                    'Generate the most important BRAND NEW historical events, tragedies, wars, and discoveries that shaped this world. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated events.',
                                    'events'
                                )
                            }
                            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''
                                }`}
                            title="Generate Events"
                            disabled={isLoading}
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-4">
                    {(localPlan.events || []).length === 0 ? (
                        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                            No events defined. Click + to add one.
                        </div>
                    ) : (
                        (localPlan.events || []).map((event, idx) => (
                            <div key={idx} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <input
                                        type="text"
                                        className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
                                        placeholder="Event Name..."
                                        value={event.name || ''}
                                        onChange={e => updateEvent(idx, 'name', e.target.value)}
                                    />
                                    <button
                                        onClick={() => removeEvent(idx)}
                                        className="ml-2 p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                                        title="Remove Event"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <textarea
                                    className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-24"
                                    placeholder="Description..."
                                    value={event.description || ''}
                                    onChange={e => updateEvent(idx, 'description', e.target.value)}
                                />
                            </div>
                        ))
                    )}
                </div>
            ) : displayEvents.length === 0 ? (
                <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                    No events defined. History has not yet been written.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayEvents.map((event, idx) => {
                        if (!event) return null
                        return (
                            <div
                                key={idx}
                                className="group cursor-default transition-all duration-300 border hover:border-primary/30 bg-card/40 backdrop-blur-sm p-5 rounded-xl flex flex-col gap-2"
                            >
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 rounded-lg shrink-0 bg-rose-500/15 border-rose-500/20">
                                        <CalendarHeart className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <h4 className="font-syne font-bold text-[16px] text-foreground leading-tight">
                                        {event.name}
                                    </h4>
                                </div>
                                <div className="text-sm text-muted-foreground/80 leading-relaxed mt-2">
                                    <RichText text={event.description} projectId={projectId} inline />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
