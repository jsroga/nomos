import React, { useState } from 'react'
import { Crown, Notebook, Users, Zap } from 'lucide-react'
import { ParsedDescriptionMeta } from '../types/episode-roadmap-card'
import { EpisodeRoadmapEpisode } from '../types/episode-roadmap-card'
import { resolveFactionName } from '../utils/parse-episode-description'

interface EpisodeWritersRoomProps {
  episode: EpisodeRoadmapEpisode
  parsedMeta: ParsedDescriptionMeta
  factions: { id: string; name: string }[]
}

function formatFactionPart(part: string, factions: { id: string; name: string }[]): string {
  return part
    .replace(/([\w\s-]+)?\s*\(?(f\d+)\)?/i, (_match, _nameContext: string, id: string) =>
      resolveFactionName(id, factions)
    )
    .trim()
}

function FactionsNote({
  factionsText,
  factionList,
}: {
  factionsText: string
  factionList: { id: string; name: string }[]
}) {
  const parts = factionsText.split(',')

  return (
    <div className="flex gap-2">
      <Crown size={12} className="text-orange-400/40 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">
          Key Factions
        </span>
        <span>
          {parts.map((part, i, arr) => (
            <React.Fragment key={i}>
              {formatFactionPart(part, factionList)}
              {i < arr.length - 1 && ', '}
            </React.Fragment>
          ))}
        </span>
      </div>
    </div>
  )
}

export function EpisodeWritersRoom({ episode, parsedMeta, factions }: EpisodeWritersRoomProps) {
  const [showWritersRoom, setShowWritersRoom] = useState(false)
  const worldImpact = episode.worldConsequence || parsedMeta.worldConsequence

  return (
    <div className="pt-2 border-t border-white/5">
      <button
        onClick={e => {
          e.stopPropagation()
          setShowWritersRoom(!showWritersRoom)
        }}
        className="flex items-center gap-2 text-[10px] text-muted-foreground/40 hover:text-muted-foreground/70 transition-colors uppercase tracking-widest"
      >
        <Notebook size={12} />
        Writer's Room {showWritersRoom ? '▾' : '▸'}
      </button>

      {showWritersRoom && (
        <div className="mt-3 space-y-3 text-xs text-muted-foreground/50 animate-in fade-in duration-150">
          {parsedMeta.factions && (
            <FactionsNote factionsText={parsedMeta.factions} factionList={factions} />
          )}

          {parsedMeta.focus && (
            <div className="flex gap-2">
              <Users size={12} className="text-blue-400/40 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">
                  Main Focus
                </span>
                <span>{parsedMeta.focus}</span>
              </div>
            </div>
          )}

          {worldImpact && (
            <div className="flex gap-2">
              <Zap size={12} className="text-red-400/40 mt-0.5 flex-shrink-0" />
              <div>
                <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">
                  World Impact
                </span>
                <span>{worldImpact}</span>
              </div>
            </div>
          )}

          {episode.consequences && episode.consequences.length > 0 && (
            <div>
              <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-1">
                Ripple Effects
              </span>
              <ul className="space-y-1 pl-1">
                {episode.consequences.map((c, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="opacity-40">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {episode.reasoning && (
            <div>
              <span className="text-[9px] uppercase tracking-wider opacity-60 block mb-0.5">
                Showrunner Notes
              </span>
              <p className="text-emerald-500/50 italic">{episode.reasoning}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
