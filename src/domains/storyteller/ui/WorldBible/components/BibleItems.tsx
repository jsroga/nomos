import React from 'react'
import { Package, Plus, RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { useBible } from './bible-context'
import { SectionPendingOverlay } from './SectionPendingOverlay'
import { RichText } from '../../RichText'

export const BibleItems: React.FC = () => {
    const {
        storyPlan,
        isEditing,
        localPlan,
        updateItem,
        addItem,
        removeItem,
        isReadOnly,
        onSendMessage,
        loadingSections,
        pendingActions,
        projectId,
    } = useBible()

    // Use localPlan for display when not editing to show latest saved data
    const displayItems = isEditing
        ? (localPlan.items || [])
        : (localPlan.items || storyPlan.items || [])
    const isLoading = loadingSections?.items?.loading ?? false
    const pendingAction = pendingActions?.items

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
                        <span>Forging items...</span>
                    </div>
                </div>
            )}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-amber-500/80" />
                    <h3 className="font-syne font-bold text-lg">Notable Items & Objects</h3>
                </div>
                <div className="flex gap-2">
                    {isEditing && (
                        <button
                            onClick={addItem}
                            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''
                                }`}
                            title="Add Item"
                            disabled={isLoading}
                        >
                            <Plus size={14} />
                        </button>
                    )}
                    {!isReadOnly && onSendMessage && (
                        <button
                            onClick={() =>
                                onSendMessage?.(
                                    'Generate completely BRAND NEW, significant items, artifacts, weapons, or objects of power in this world. IMPORTANT: Take a completely new creative direction and do NOT repeat any previously generated items.',
                                    'items'
                                )
                            }
                            className={`p-1.5 rounded-lg transition-all duration-200 text-muted-foreground hover:text-indigo-400 hover:bg-indigo-500/10 hover:scale-105 ${isLoading ? 'pointer-events-none opacity-50' : ''
                                }`}
                            title="Generate Items"
                            disabled={isLoading}
                        >
                            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    )}
                </div>
            </div>

            {isEditing ? (
                <div className="space-y-4">
                    {(localPlan.items || []).length === 0 ? (
                        <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                            No items defined. Click + to add one.
                        </div>
                    ) : (
                        (localPlan.items || []).map((item, idx) => (
                            <div key={idx} className="p-4 bg-muted/10 border border-border rounded-lg space-y-3">
                                <div className="flex items-center justify-between">
                                    <input
                                        type="text"
                                        className="flex-1 p-2 bg-background border border-border rounded text-sm font-bold"
                                        placeholder="Item Name..."
                                        value={item.name || ''}
                                        onChange={e => updateItem(idx, 'name', e.target.value)}
                                    />
                                    <button
                                        onClick={() => removeItem(idx)}
                                        className="ml-2 p-1.5 text-red-400 hover:bg-red-400/20 rounded"
                                        title="Remove Item"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                                <textarea
                                    className="w-full p-2 bg-background border border-border rounded text-sm resize-none h-24"
                                    placeholder="Description..."
                                    value={item.description || ''}
                                    onChange={e => updateItem(idx, 'description', e.target.value)}
                                />
                            </div>
                        ))
                    )}
                </div>
            ) : displayItems.length === 0 ? (
                <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-sm italic">
                    No items defined. The world is empty of artifacts.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayItems.map((item, idx) => {
                        if (!item) return null
                        return (
                            <div
                                key={idx}
                                className="group cursor-default transition-all duration-300 border hover:border-primary/30 bg-card/40 backdrop-blur-sm p-5 rounded-xl flex flex-col gap-2"
                            >
                                <div className="flex items-center gap-3 mb-1">
                                    <div className="p-2 rounded-lg shrink-0 bg-amber-500/15 border-amber-500/20">
                                        <Package className="w-4 h-4 text-amber-500" />
                                    </div>
                                    <h4 className="font-syne font-bold text-[16px] text-foreground leading-tight">
                                        {item.name}
                                    </h4>
                                </div>
                                <div className="text-sm text-muted-foreground/80 leading-relaxed mt-2">
                                    <RichText text={item.description} projectId={projectId} inline />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </section>
    )
}
