import {
  Anchor,
  HelpCircle,
  LucideIcon,
  Skull,
  Swords,
} from 'lucide-react'
import {
  EpisodeRoadmapBeatColor,
  EpisodeRoadmapBeatLabel,
} from '../constants/episode-roadmap-card'
import { EpisodeRoadmapEpisode } from '../types/episode-roadmap-card'

export interface StructuralBeat {
  label: EpisodeRoadmapBeatLabel
  value: string
  icon: LucideIcon
  color: EpisodeRoadmapBeatColor
}

export interface ActBeat {
  label: EpisodeRoadmapBeatLabel
  value: string
}

function optionalBeat<T>(condition: string | null | undefined, beat: T): T[] {
  return condition ? [beat] : []
}

export function buildStructuralBeats(episode: EpisodeRoadmapEpisode): StructuralBeat[] {
  return [
    ...optionalBeat(episode.protagonistHook, {
      label: EpisodeRoadmapBeatLabel.ProtagonistHook,
      value: episode.protagonistHook ?? '',
      icon: Anchor,
      color: EpisodeRoadmapBeatColor.ProtagonistHook,
    }),
    ...optionalBeat(episode.antagonistMove, {
      label: EpisodeRoadmapBeatLabel.AntagonistMove,
      value: episode.antagonistMove ?? '',
      icon: Swords,
      color: EpisodeRoadmapBeatColor.AntagonistMove,
    }),
    ...optionalBeat(episode.fatalFlaw, {
      label: EpisodeRoadmapBeatLabel.FatalFlaw,
      value: episode.fatalFlaw ?? '',
      icon: Skull,
      color: EpisodeRoadmapBeatColor.FatalFlaw,
    }),
    ...optionalBeat(episode.thematicQuestion, {
      label: EpisodeRoadmapBeatLabel.ThematicQuestion,
      value: episode.thematicQuestion ?? '',
      icon: HelpCircle,
      color: EpisodeRoadmapBeatColor.ThematicQuestion,
    }),
  ]
}

export function buildActBeats(episode: EpisodeRoadmapEpisode): ActBeat[] {
  return [
    ...optionalBeat(episode.incitingIncident, {
      label: EpisodeRoadmapBeatLabel.IncitingIncident,
      value: episode.incitingIncident ?? '',
    }),
    ...optionalBeat(episode.midpoint, {
      label: EpisodeRoadmapBeatLabel.Midpoint,
      value: episode.midpoint ?? '',
    }),
    ...optionalBeat(episode.finale, {
      label: EpisodeRoadmapBeatLabel.Finale,
      value: episode.finale ?? '',
    }),
  ]
}

export function episodeSynopsis(episode: EpisodeRoadmapEpisode): string {
  return episode.logline || episode.description || ''
}

export function episodeTitle(episode: EpisodeRoadmapEpisode, index: number): string {
  return episode.title || episode.name || `Episode ${index + 1}`
}

export function hasWritersNotes(
  episode: EpisodeRoadmapEpisode,
  parsedMeta: { factions?: string; focus?: string; worldConsequence?: string }
): boolean {
  return Boolean(
    episode.reasoning ||
      episode.consequences?.length ||
      episode.worldConsequence ||
      parsedMeta.factions ||
      parsedMeta.focus ||
      parsedMeta.worldConsequence
  )
}
