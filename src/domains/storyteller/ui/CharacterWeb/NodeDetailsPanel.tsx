import React from 'react'
import { cn } from '@/shared/data/utils'
import { StoryEntityType } from '@/domains/storyteller/core/entities/constants/entity-types'
import { ReferenceText } from '../ReferenceText'
import { CHARACTER_WEB_DEFAULT_ENTITY_TYPE } from './constants/character-web'
import { CharacterWebNode } from './types'

interface NodeDetailsPanelProps {
  node: CharacterWebNode
  onClose: () => void
  projectId: string
}

function formatEntityLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ')
}

function entityBadgeClass(type: `${StoryEntityType}`): string {
  if (type === StoryEntityType.Character) return 'bg-purple-500/20 text-purple-300'
  return 'bg-zinc-500/20 text-zinc-400'
}

function entityAvatarClass(type: `${StoryEntityType}`): string {
  if (type === StoryEntityType.Character) return 'bg-purple-900/20 text-purple-200'
  if (type === StoryEntityType.Faction) return 'bg-blue-900/20 text-blue-200'
  if (type === StoryEntityType.Place) return 'bg-emerald-900/20 text-emerald-200'
  return 'bg-zinc-800/50 text-zinc-300'
}

function stressBarClass(stressLevel: number): string {
  if (stressLevel > 70) return 'bg-red-500/70'
  if (stressLevel > 40) return 'bg-amber-500/70'
  return 'bg-emerald-500/70'
}

export function NodeDetailsPanel({ node, onClose, projectId }: NodeDetailsPanelProps) {
  const data = node.data
  const type = data.type || CHARACTER_WEB_DEFAULT_ENTITY_TYPE
  const isCharacter = type === StoryEntityType.Character

  return (
    <div className="absolute top-[70px] right-4 w-72 bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 rounded-lg shadow-2xl overflow-hidden z-10 animate-in fade-in slide-in-from-right-2 duration-200">
      <div className="p-3 flex items-center gap-3 border-b border-zinc-800/50 bg-zinc-900/30">
        <div className="flex-shrink-0 relative">
          {data.avatarUrl ? (
            <img
              src={data.avatarUrl}
              alt={data.name}
              className="w-10 h-10 rounded-md object-cover border border-zinc-700/50 shadow-sm"
            />
          ) : (
            <div
              className={cn(
                'w-10 h-10 rounded-md flex items-center justify-center border border-zinc-700/50 shadow-sm text-sm font-bold',
                entityAvatarClass(type)
              )}
            >
              {data.name.charAt(0)}
            </div>
          )}

          <div
            className={cn(
              'absolute -bottom-1 -right-1 px-1 py-px rounded-[2px] text-[8px] uppercase font-bold tracking-wider leading-none shadow-sm border border-black/20',
              entityBadgeClass(type)
            )}
          >
            {formatEntityLabel(type).slice(0, 4)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100 truncate pr-6 leading-tight">
              {data.name}
            </h3>
            <button
              onClick={onClose}
              className="absolute top-2 right-2 text-zinc-600 hover:text-zinc-300 transition-colors p-1"
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

          <div className="flex items-baseline gap-2 mt-0.5">
            {data.role ? (
              <span className="text-[10px] text-zinc-400 truncate max-w-[140px]" title={data.role}>
                {data.role}
              </span>
            ) : (
              <span className="text-[10px] italic text-zinc-600">No Role</span>
            )}
            {data.isCentral && (
              <span className="text-[8px] text-amber-500/80 font-bold ml-auto uppercase tracking-tighter">
                ANCHOR
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 space-y-3">
        {data.description ? (
          <div className="text-[10px] leading-relaxed text-zinc-400 line-clamp-3">
            <ReferenceText
              text={data.description}
              projectId={projectId}
              className="text-zinc-400"
            />
          </div>
        ) : (
          <div className="text-[10px] italic text-zinc-600">No description available.</div>
        )}

        {isCharacter &&
          (data.stressLevel !== undefined || data.transformationProgress !== undefined) && (
            <div className="space-y-2 pt-1">
              {data.stressLevel !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider w-8">
                    Stress
                  </span>
                  <div className="flex-1 h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full', stressBarClass(data.stressLevel))}
                      style={{ width: `${data.stressLevel}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">
                    {data.stressLevel}%
                  </span>
                </div>
              )}

              {data.transformationProgress !== undefined && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] text-zinc-500 uppercase tracking-wider w-8">Arc</span>
                  <div className="flex-1 h-1 bg-zinc-800/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500/70 rounded-full"
                      style={{ width: `${data.transformationProgress}%` }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400 w-6 text-right">
                    {data.transformationProgress}%
                  </span>
                </div>
              )}
            </div>
          )}
      </div>
    </div>
  )
}
