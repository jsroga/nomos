import { ParsedDescription } from '../types/episode-roadmap-card'

export function parseEpisodeDescription(text: string): ParsedDescription {
  return { cleanText: (text || '').trim(), extracted: {} }
}

export function resolveFactionName(
  val: string,
  factions: { id: string; name: string }[]
): string {
  const byId = factions.find(f => f.id === val || f.id === val.toLowerCase())
  return byId ? byId.name : val
}
