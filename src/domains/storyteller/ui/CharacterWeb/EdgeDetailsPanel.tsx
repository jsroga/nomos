import React from 'react'
import {
  CHARACTER_WEB_DEFAULT_RELATIONSHIP,
} from './constants/character-web'
import {
  CharacterWebEdge,
  readRelationshipEdgeEvidence,
  readRelationshipEdgeLlmGrounded,
} from './types'

interface EdgeDetailsPanelProps {
  edge: CharacterWebEdge
  sourceName: string
  targetName: string
  onClose: () => void
}

function formatRelationshipLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
}

export function EdgeDetailsPanel({
  edge,
  sourceName,
  targetName,
  onClose,
}: EdgeDetailsPanelProps) {
  const data = edge.data
  const relType = data?.relationshipType || CHARACTER_WEB_DEFAULT_RELATIONSHIP
  const strength = data?.strength ?? 0
  const evidence = readRelationshipEdgeEvidence(data)
  const llmGrounded = readRelationshipEdgeLlmGrounded(data)

  return (
    <div className="absolute top-[70px] right-4 w-72 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-lg shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="p-3 flex items-start justify-between border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold text-zinc-100">{sourceName}</span>
            <span className="text-[9px] text-zinc-500">→</span>
            <span className="text-[10px] font-semibold text-zinc-100">{targetName}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-300 border border-zinc-700">
              {formatRelationshipLabel(relType)}
            </span>
            {llmGrounded ? (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-emerald-900/30 text-emerald-400 border border-emerald-800/50">
                ✓ LLM Evidence
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider bg-zinc-800/50 text-zinc-500 border border-zinc-700/50">
                Heuristic
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-zinc-600 hover:text-zinc-300 transition-colors p-1 ml-2 flex-shrink-0"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>

      <div className="px-3 pt-2.5 pb-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-zinc-500 uppercase tracking-wider w-12">Strength</span>
          <div className="flex-1 h-1 bg-zinc-800/50 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-zinc-500 to-emerald-500"
              style={{ width: `${Math.round(strength * 100)}%` }}
            />
          </div>
          <span className="text-[9px] font-mono text-zinc-400 w-7 text-right">
            {Math.round(strength * 100)}%
          </span>
        </div>
      </div>

      <div className="p-3 pt-1.5">
        {evidence ? (
          <div>
            <span className="text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">
              Evidence
            </span>
            <blockquote className="text-[10px] leading-relaxed text-zinc-300 italic border-l-2 border-zinc-700 pl-2">
              {evidence}
            </blockquote>
          </div>
        ) : (
          <div className="text-[10px] italic text-zinc-600">
            No textual evidence — relationship inferred from embedding similarity or faction data.
          </div>
        )}
      </div>
    </div>
  )
}
