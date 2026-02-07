'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  XCircle,
  AlertCircle,
  Plus,
  Minus,
  Edit3,
  Eye,
  Code,
  FileText,
  Users,
  Globe,
  Sparkles,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { AgentAction } from '../actions/types'
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued'
import { cn } from '@/lib/utils'

interface ActionChange {
  path: string
  before: unknown
  after: unknown
  reason?: string
  changeType: 'add' | 'modify' | 'remove'
  category: string
  friendlyName: string
  summary?: string
}

interface ActionApprovalModalProps {
  action: AgentAction
  agentName: string
  onApprove: () => void
  onReject: () => void
  onClose: () => void
  isOpen: boolean
}

export const ActionApprovalModal: React.FC<ActionApprovalModalProps> = ({
  action,
  agentName,
  onApprove,
  onReject,
  onClose,
  isOpen,
}) => {
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0)
  const [viewMode, setViewMode] = useState<'summary' | 'diff'>('summary')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  
  const changes = useMemo(() => extractChanges(action), [action])
  const currentChange = changes[currentChangeIndex]

  // Group changes by category for summary view
  const changesByCategory = useMemo(() => {
    const grouped: Record<string, ActionChange[]> = {}
    changes.forEach(change => {
      if (!grouped[change.category]) {
        grouped[change.category] = []
      }
      grouped[change.category].push(change)
    })
    return grouped
  }, [changes])

  // Stats for the header
  const stats = useMemo(() => {
    const adds = changes.filter(c => c.changeType === 'add').length
    const mods = changes.filter(c => c.changeType === 'modify').length
    const removes = changes.filter(c => c.changeType === 'remove').length
    return { adds, mods, removes, total: changes.length }
  }, [changes])

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        onApprove()
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        onReject()
      } else if (e.key === 'ArrowLeft' && viewMode === 'diff') {
        e.preventDefault()
        setCurrentChangeIndex(Math.max(0, currentChangeIndex - 1))
      } else if (e.key === 'ArrowRight' && viewMode === 'diff') {
        e.preventDefault()
        setCurrentChangeIndex(Math.min(changes.length - 1, currentChangeIndex + 1))
      } else if (e.key === 'Tab') {
        e.preventDefault()
        setViewMode(v => v === 'summary' ? 'diff' : 'summary')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, currentChangeIndex, changes.length, onApprove, onReject, onClose, viewMode])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-background border border-border shadow-2xl rounded-lg flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header with Stats */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <div className="font-bold text-sm uppercase tracking-wider text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                {formatActionType(action.type)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
                <span>From: <span className="text-foreground">{agentName}</span></span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  Confidence: 
                  <span className={cn(
                    'font-medium',
                    (action.confidence || 0.8) >= 0.8 ? 'text-green-400' :
                    (action.confidence || 0.8) >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                  )}>
                    {Math.round((action.confidence || 0.8) * 100)}%
                  </span>
                </span>
              </div>
            </div>
          </div>
          
          {/* Stats Pills */}
          <div className="flex items-center gap-3">
            <div className="flex gap-2 text-xs">
              {stats.adds > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-green-500/10 text-green-400 rounded-full">
                  <Plus className="w-3 h-3" /> {stats.adds} new
                </span>
              )}
              {stats.mods > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-full">
                  <Edit3 className="w-3 h-3" /> {stats.mods} modified
                </span>
              )}
              {stats.removes > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-red-500/10 text-red-400 rounded-full">
                  <Minus className="w-3 h-3" /> {stats.removes} removed
                </span>
              )}
            </div>
            <div className="h-6 w-px bg-border" />
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-border/30 bg-background/50">
          <div className="flex gap-1 p-0.5 bg-muted/50 rounded-lg">
            <Button
              variant={viewMode === 'summary' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('summary')}
              className="h-7 gap-2 text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              Summary View
            </Button>
            <Button
              variant={viewMode === 'diff' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('diff')}
              className="h-7 gap-2 text-xs"
            >
              <Code className="w-3.5 h-3.5" />
              Code Diff
            </Button>
          </div>
          {viewMode === 'diff' && changes.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {currentChangeIndex + 1} of {changes.length}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentChangeIndex(Math.max(0, currentChangeIndex - 1))}
                  disabled={currentChangeIndex === 0}
                  className="h-6 w-6"
                >
                  <ChevronLeft className="w-3 h-3" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentChangeIndex(Math.min(changes.length - 1, currentChangeIndex + 1))}
                  disabled={currentChangeIndex === changes.length - 1}
                  className="h-6 w-6"
                >
                  <ChevronRight className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'summary' ? (
            /* Summary View - User Friendly */
            <div className="h-full overflow-auto p-6">
              {/* AI Reasoning Card */}
              {action.reasoning && (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm font-medium text-primary mb-1">Why this change?</div>
                      <p className="text-sm text-foreground/80 leading-relaxed">{action.reasoning}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Changes by Category */}
              <div className="space-y-4">
                {Object.entries(changesByCategory).map(([category, categoryChanges]) => (
                  <div key={category} className="border border-border/50 rounded-lg overflow-hidden">
                    {/* Category Header */}
                    <button
                      className="w-full flex items-center justify-between p-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                      onClick={() => toggleSection(category)}
                    >
                      <div className="flex items-center gap-3">
                        {getCategoryIcon(category)}
                        <span className="font-medium">{category}</span>
                        <span className="text-xs text-muted-foreground">
                          ({categoryChanges.length} change{categoryChanges.length > 1 ? 's' : ''})
                        </span>
                      </div>
                      {expandedSections.has(category) ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </button>

                    {/* Category Changes */}
                    {expandedSections.has(category) && (
                      <div className="divide-y divide-border/30">
                        {categoryChanges.map((change, idx) => (
                          <div key={idx} className="p-4">
                            <div className="flex items-start gap-3">
                              <ChangeTypeIcon type={change.changeType} />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-medium text-sm">{change.friendlyName}</span>
                                  <ChangeTypeBadge type={change.changeType} />
                                </div>
                                
                                {/* Visual Before/After for simple values */}
                                {change.summary ? (
                                  <p className="text-sm text-muted-foreground">{change.summary}</p>
                                ) : isSimpleValue(change.after) ? (
                                  <div className="flex items-center gap-2 text-sm">
                                    {change.before !== null && (
                                      <>
                                        <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded line-through">
                                          {formatSimpleValue(change.before)}
                                        </span>
                                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                      </>
                                    )}
                                    <span className="px-2 py-1 bg-green-500/10 text-green-400 rounded">
                                      {formatSimpleValue(change.after)}
                                    </span>
                                  </div>
                                ) : Array.isArray(change.after) ? (
                                  <div className="mt-2 space-y-1">
                                    {(change.after as any[]).slice(0, 5).map((item, i) => (
                                      <div key={i} className="flex items-center gap-2 text-sm">
                                        <Plus className="w-3 h-3 text-green-400" />
                                        <span className="text-foreground/80">
                                          {typeof item === 'object' ? (item.name || item.title || JSON.stringify(item).slice(0, 50)) : item}
                                        </span>
                                      </div>
                                    ))}
                                    {(change.after as any[]).length > 5 && (
                                      <span className="text-xs text-muted-foreground">
                                        +{(change.after as any[]).length - 5} more items
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-2 h-7 text-xs"
                                    onClick={() => {
                                      const idx = changes.findIndex(c => c === change)
                                      if (idx >= 0) {
                                        setCurrentChangeIndex(idx)
                                        setViewMode('diff')
                                      }
                                    }}
                                  >
                                    <Code className="w-3 h-3 mr-1" />
                                    View Details
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Expand All Button */}
              {Object.keys(changesByCategory).length > 0 && (
                <div className="mt-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      if (expandedSections.size === Object.keys(changesByCategory).length) {
                        setExpandedSections(new Set())
                      } else {
                        setExpandedSections(new Set(Object.keys(changesByCategory)))
                      }
                    }}
                  >
                    {expandedSections.size === Object.keys(changesByCategory).length
                      ? 'Collapse All'
                      : 'Expand All'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            /* Diff View - Technical */
            <div className="h-full overflow-hidden flex flex-col">
              {/* Field Path */}
              {currentChange && (
                <div className="px-6 py-2 bg-muted/20 border-b border-border/30 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-primary">{currentChange.path}</span>
                    <ChangeTypeBadge type={currentChange.changeType} />
                  </div>
                  {currentChange.reason && (
                    <div className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" />
                      {currentChange.reason}
                    </div>
                  )}
                </div>
              )}

              {/* Diff Content - Shadcn-styled */}
              <div className="flex-1 overflow-auto">
                {currentChange ? (
                  <div className="h-full">
                    {/* Split View Header */}
                    <div className="grid grid-cols-2 border-b border-border/50 sticky top-0 bg-background z-10">
                      <div className="px-4 py-2 text-xs font-medium text-red-400 bg-red-500/5 border-r border-border/50 flex items-center gap-2">
                        <Minus className="w-3 h-3" />
                        BEFORE
                      </div>
                      <div className="px-4 py-2 text-xs font-medium text-green-400 bg-green-500/5 flex items-center gap-2">
                        <Plus className="w-3 h-3" />
                        AFTER
                      </div>
                    </div>
                    <ReactDiffViewer
                      oldValue={formatJSON(currentChange.before)}
                      newValue={formatJSON(currentChange.after)}
                      splitView={true}
                      compareMethod={DiffMethod.WORDS}
                      hideLineNumbers={false}
                      showDiffOnly={false}
                      styles={{
                        variables: {
                          dark: {
                            diffViewerBackground: 'transparent',
                            diffViewerColor: 'hsl(var(--foreground))',
                            addedBackground: 'rgba(34, 197, 94, 0.08)',
                            addedColor: 'rgb(134, 239, 172)',
                            removedBackground: 'rgba(239, 68, 68, 0.08)',
                            removedColor: 'rgb(252, 165, 165)',
                            wordAddedBackground: 'rgba(34, 197, 94, 0.25)',
                            wordRemovedBackground: 'rgba(239, 68, 68, 0.25)',
                            addedGutterBackground: 'rgba(34, 197, 94, 0.15)',
                            removedGutterBackground: 'rgba(239, 68, 68, 0.15)',
                            gutterBackground: 'hsl(var(--muted)/0.3)',
                            gutterColor: 'hsl(var(--muted-foreground))',
                            codeFoldGutterBackground: 'hsl(var(--muted)/0.5)',
                            codeFoldBackground: 'hsl(var(--muted)/0.3)',
                            emptyLineBackground: 'transparent',
                            highlightBackground: 'rgba(59, 130, 246, 0.1)',
                            highlightGutterBackground: 'rgba(59, 130, 246, 0.2)',
                          },
                        },
                        diffContainer: {
                          borderRadius: '0',
                          border: 'none',
                        },
                        line: {
                          padding: '4px 12px',
                          fontSize: '13px',
                          fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
                          lineHeight: '1.6',
                        },
                        gutter: {
                          padding: '4px 12px',
                          minWidth: '40px',
                          fontSize: '11px',
                        },
                        wordDiff: {
                          padding: '2px 4px',
                          borderRadius: '3px',
                        },
                        contentText: {
                          lineHeight: '1.6',
                        },
                      }}
                      useDarkTheme={true}
                    />
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No changes to display
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/30">
          <div className="flex gap-3 text-[10px] text-muted-foreground font-mono">
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Esc</kbd> Close</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Tab</kbd> Switch View</span>
            {viewMode === 'diff' && changes.length > 1 && (
              <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">←→</kbd> Navigate</span>
            )}
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Enter</kbd> Approve</span>
            <span><kbd className="px-1.5 py-0.5 bg-muted rounded border border-border">Del</kbd> Reject</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onReject} className="gap-2">
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
            <Button onClick={onApprove} className="gap-2 bg-emerald-500 hover:bg-emerald-600">
              <Check className="w-4 h-4" />
              Approve All Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper Components
const ChangeTypeIcon: React.FC<{ type: ActionChange['changeType'] }> = ({ type }) => {
  switch (type) {
    case 'add':
      return <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
        <Plus className="w-3.5 h-3.5 text-green-400" />
      </div>
    case 'modify':
      return <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
        <Edit3 className="w-3.5 h-3.5 text-blue-400" />
      </div>
    case 'remove':
      return <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
        <Minus className="w-3.5 h-3.5 text-red-400" />
      </div>
  }
}

const ChangeTypeBadge: React.FC<{ type: ActionChange['changeType'] }> = ({ type }) => {
  const config = {
    add: { label: 'New', className: 'bg-green-500/10 text-green-400' },
    modify: { label: 'Updated', className: 'bg-blue-500/10 text-blue-400' },
    remove: { label: 'Removed', className: 'bg-red-500/10 text-red-400' },
  }[type]
  
  return (
    <span className={cn('text-[10px] px-1.5 py-0.5 rounded', config.className)}>
      {config.label}
    </span>
  )
}

function getCategoryIcon(category: string) {
  const icons: Record<string, React.ReactNode> = {
    'Characters': <Users className="w-4 h-4 text-purple-400" />,
    'World Rules': <Globe className="w-4 h-4 text-blue-400" />,
    'Story': <FileText className="w-4 h-4 text-orange-400" />,
    'Premise': <Sparkles className="w-4 h-4 text-primary" />,
  }
  return icons[category] || <FileText className="w-4 h-4 text-muted-foreground" />
}

function isSimpleValue(value: unknown): boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
}

function formatSimpleValue(value: unknown): string {
  if (value === null || value === undefined) return '(empty)'
  if (typeof value === 'string') return value.length > 50 ? value.slice(0, 50) + '...' : value
  return String(value)
}

/**
 * Extract changes from an action with rich metadata
 */
function extractChanges(action: AgentAction): ActionChange[] {
  const changes: ActionChange[] = []
  const payload = action.payload || {}

  // Field name to friendly name mapping
  const friendlyNames: Record<string, string> = {
    characters: 'Characters',
    worldRules: 'World Rules',
    factions: 'Factions',
    themes: 'Story Themes',
    tone: 'Narrative Tone',
    genre: 'Genre',
    protagonistHook: 'Protagonist Hook',
    fatalFlaw: 'Fatal Flaw',
    stakes: 'Stakes',
    inevitableConsequence: 'Inevitable Consequence',
    title: 'Title',
    logline: 'Logline',
    theHook: 'The Hook',
    theTurn: 'The Turn',
    theAftermath: 'The Aftermath',
    transformation: 'Character Transformation',
    thematicFocus: 'Thematic Focus',
    name: 'Name',
    role: 'Role',
    traits: 'Character Traits',
    goal: 'Character Goal',
    psychology: 'Psychology Profile',
    content: 'Script Content',
    script: 'Script',
    beatBoard: 'Story Beats',
    premise: 'Episode Premise',
    updatedFields: 'Updated Fields',
    // New section fields
    soundtracks: 'Soundtracks',
    inspirations: 'Inspirations',
    keyCharacters: 'Key Characters',
    worldDescription: 'World Description',
    plotTwists: 'Plot Twists',
    sequences: 'Episode Roadmap',
    episodeRoadmap: 'Episode Roadmap',
  }

  // Field to category mapping
  const fieldCategories: Record<string, string> = {
    characters: 'Characters',
    psychology: 'Characters',
    traits: 'Characters',
    goal: 'Characters',
    role: 'Characters',
    keyCharacters: 'Characters',
    worldRules: 'World Rules',
    factions: 'World Rules',
    worldDescription: 'World Rules',
    themes: 'Story',
    tone: 'Story',
    genre: 'Story',
    protagonistHook: 'Premise',
    fatalFlaw: 'Premise',
    stakes: 'Premise',
    inevitableConsequence: 'Premise',
    title: 'Premise',
    logline: 'Premise',
    theHook: 'Premise',
    theTurn: 'Premise',
    theAftermath: 'Premise',
    transformation: 'Premise',
    thematicFocus: 'Premise',
    script: 'Script',
    content: 'Script',
    beatBoard: 'Story',
    premise: 'Premise',
    // New section fields
    soundtracks: 'Atmosphere',
    inspirations: 'Atmosphere',
    plotTwists: 'Story',
    sequences: 'Roadmap',
    episodeRoadmap: 'Roadmap',
  }

  // Generate summary for common types
  const generateSummary = (key: string, value: unknown): string | undefined => {
    if (Array.isArray(value)) {
      const count = value.length
      const itemType = key === 'characters' || key === 'keyCharacters' ? 'character' :
                       key === 'worldRules' ? 'rule' :
                       key === 'factions' ? 'faction' :
                       key === 'themes' ? 'theme' :
                       key === 'traits' ? 'trait' :
                       key === 'soundtracks' ? 'track' :
                       key === 'plotTwists' ? 'twist' :
                       key === 'sequences' || key === 'episodeRoadmap' ? 'episode' : 'item'
      return `${count} ${itemType}${count !== 1 ? 's' : ''} ${action.type.startsWith('CREATE_') ? 'added' : 'updated'}`
    }
    if (typeof value === 'string' && value.length > 100) {
      return value.slice(0, 100) + '...'
    }
    return undefined
  }

  // For UPDATE actions, extract the fields being updated
  if (action.type.startsWith('UPDATE_')) {
    const srcPayload = payload as any
    
    // Extract "before" data if provided by stream (for diff viewer)
    const beforeData = srcPayload._before || null
    
    // Handle updatedFields wrapper (common in bible updates)
    const source = srcPayload.updatedFields || 
                   (srcPayload.updates && typeof srcPayload.updates === 'object' && !Array.isArray(srcPayload.updates)
                     ? srcPayload.updates
                     : srcPayload)

    Object.entries(source).forEach(([key, value]) => {
      // Filter out technical keys
      if (key !== 'id' && key !== 'beatId' && key !== 'characterId' && key !== 'projectId' && key !== 'episodeId' && key !== '_before') {
        changes.push({
          path: key,
          before: beforeData, // Use the "before" data from stream
          after: value,
          reason: action.reasoning,
          changeType: beforeData ? 'modify' : 'add',
          category: fieldCategories[key] || 'General',
          friendlyName: friendlyNames[key] || formatFieldName(key),
          summary: generateSummary(key, value),
        })
      }
    })
  }

  // For CREATE actions, show the full object
  else if (action.type.startsWith('CREATE_')) {
    const entityType = action.type.replace('CREATE_', '').toLowerCase()
    changes.push({
      path: entityType,
      before: null,
      after: payload,
      reason: action.reasoning,
      changeType: 'add',
      category: entityType === 'beat' ? 'Story' : 
                entityType === 'character' ? 'Characters' : 'General',
      friendlyName: 'New ' + formatFieldName(entityType),
      summary: generateSummary(entityType, payload),
    })
  }

  // For DELETE actions
  else if (action.type.startsWith('DELETE_')) {
    const entityType = action.type.replace('DELETE_', '').toLowerCase()
    changes.push({
      path: entityType,
      before: payload,
      after: null,
      reason: action.reasoning,
      changeType: 'remove',
      category: entityType === 'beat' ? 'Story' : 
                entityType === 'character' ? 'Characters' : 'General',
      friendlyName: formatFieldName(entityType),
    })
  }

  // Fallback: If we have a payload but no changes extracted yet
  else if (changes.length === 0 && Object.keys(payload).length > 0) {
    changes.push({
      path: 'payload',
      before: null,
      after: payload,
      reason: action.reasoning,
      changeType: 'modify',
      category: 'General',
      friendlyName: 'Action Data',
    })
  }

  return changes
}

function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .trim()
    .replace(/\b\w/g, c => c.toUpperCase())
}

/**
 * Format value as pretty JSON
 */
function formatJSON(value: unknown): string {
  if (value === null || value === undefined) {
    return '(empty)'
  }

  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/**
 * Format action type for display
 */
function formatActionType(type: string): string {
  return type
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())
}

export default ActionApprovalModal
