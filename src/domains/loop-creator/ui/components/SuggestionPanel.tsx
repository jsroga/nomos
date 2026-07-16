import React from 'react'
import { Node, Edge } from '@xyflow/react'
import { Button } from '@/components/Button'
import {
  Check,
  X,
  Eye,
  Lightbulb,
  Plus,
  Trash2,
  Link,
  Edit,
  XCircle,
  CheckCheck,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@/components/Badge'

export interface Suggestion {
  id: string
  type:
    | 'ADD_NODE'
    | 'REMOVE_NODE'
    | 'ADD_EDGE'
    | 'REMOVE_EDGE'
    | 'MODIFY_NODE'
    | 'MODIFY_EDGE'
    | 'REMOVE_ALL_NODES'
  description: string
  payload: unknown
  preview?: {
    nodes?: Node[]
    edges?: Edge[]
  }
}

interface SuggestionPanelProps {
  suggestions: Suggestion[]
  onAccept: (suggestion: Suggestion) => void
  onReject: (suggestion: Suggestion) => void
  onPreview?: (suggestion: Suggestion) => void
  onClearAll?: () => void
  onAcceptAll?: () => void
}

const suggestionIcons: Record<Suggestion['type'], React.ReactNode> = {
  ADD_NODE: <Plus className="w-3.5 h-3.5" />,
  REMOVE_NODE: <Trash2 className="w-3.5 h-3.5" />,
  ADD_EDGE: <Link className="w-3.5 h-3.5" />,
  REMOVE_EDGE: <Trash2 className="w-3.5 h-3.5" />,
  MODIFY_NODE: <Edit className="w-3.5 h-3.5" />,
  MODIFY_EDGE: <Edit className="w-3.5 h-3.5" />,
  REMOVE_ALL_NODES: <XCircle className="w-3.5 h-3.5" />,
}

const suggestionColors: Record<Suggestion['type'], string> = {
  ADD_NODE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  REMOVE_NODE: 'bg-red-500/10 text-red-400 border-red-500/30',
  ADD_EDGE: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  REMOVE_EDGE: 'bg-red-500/10 text-red-400 border-red-500/30',
  MODIFY_NODE: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  MODIFY_EDGE: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  REMOVE_ALL_NODES: 'bg-red-500/10 text-red-400 border-red-500/30',
}

export function SuggestionPanel({
  suggestions,
  onAccept,
  onReject,
  onPreview,
  onClearAll,
  onAcceptAll,
}: SuggestionPanelProps) {
  if (suggestions.length === 0) return null

  return (
    <div className="absolute bottom-4 left-4 right-4 z-20">
      <div className="bg-[#0d0d14]/95 backdrop-blur-sm border border-cyan-500/30 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800/50 bg-cyan-950/20">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-cyan-400">AI Suggestions</span>
            <Badge
              variant="secondary"
              className="text-[10px] h-5 bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
            >
              {suggestions.length}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {onAcceptAll && suggestions.length > 1 && (
              <Button
                size="sm"
                className="h-7 text-xs bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white border-0 gap-1.5"
                onClick={onAcceptAll}
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Apply All
                <Sparkles className="w-3 h-3 opacity-70" />
              </Button>
            )}
            {onClearAll && suggestions.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-white"
                onClick={onClearAll}
              >
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Suggestions list */}
        <div className="max-h-[200px] overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.id}
              className={`flex items-center gap-3 px-4 py-3 ${
                index !== suggestions.length - 1 ? 'border-b border-slate-800/30' : ''
              } hover:bg-slate-800/20 transition-colors`}
            >
              {/* Type badge */}
              <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${suggestionColors[suggestion.type]}`}
              >
                {suggestionIcons[suggestion.type]}
                <span className="text-[10px] font-semibold uppercase tracking-wider">
                  {suggestion.type.replace('_', ' ')}
                </span>
              </div>

              {/* Description */}
              <div className="flex-1 text-sm text-slate-300">{suggestion.description}</div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {onPreview && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => onPreview(suggestion)}
                    title="Preview"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => onAccept(suggestion)}
                  title="Accept"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => onReject(suggestion)}
                  title="Reject"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t border-slate-800/30 bg-slate-900/30">
          <p className="text-[10px] text-muted-foreground/60 text-center">
            Click ✓ to apply a suggestion to the canvas, or ✗ to dismiss
          </p>
        </div>
      </div>
    </div>
  )
}
