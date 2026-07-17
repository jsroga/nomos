import { ParsedDescription, ParsedDescriptionMeta } from '../types/episode-roadmap-card'

function extractFactionMeta(text: string, extracted: ParsedDescriptionMeta): string {
  const factionMatch = text.match(/Key factions?:?\s*([^.]+(?:\([^)]+\)[^.]*)*)\./i)
  if (!factionMatch) return text
  extracted.factions = factionMatch[1]
  return text.replace(factionMatch[0], '')
}

function extractFocusMeta(text: string, extracted: ParsedDescriptionMeta): string {
  const focusMatch = text.match(/Main focus:?\s*([^.]+)\./i)
  if (!focusMatch) return text
  extracted.focus = focusMatch[1]
  return text.replace(focusMatch[0], '')
}

function extractWorldMeta(text: string, extracted: ParsedDescriptionMeta): string {
  const worldMatch = text.match(/World consequence:?\s*(.+)$/i)
  if (!worldMatch) return text
  extracted.worldConsequence = worldMatch[1]
  return text.replace(worldMatch[0], '')
}

export function parseEpisodeDescription(text: string): ParsedDescription {
  const extracted: ParsedDescriptionMeta = {}
  if (!text) return { cleanText: '', extracted }

  let cleanText = text
  cleanText = extractFactionMeta(cleanText, extracted)
  cleanText = extractFocusMeta(cleanText, extracted)
  cleanText = extractWorldMeta(cleanText, extracted)

  return { cleanText: cleanText.trim(), extracted }
}

export function resolveFactionName(
  val: string,
  factions: { id: string; name: string }[]
): string {
  const byId = factions.find(f => f.id === val || f.id === val.toLowerCase())
  return byId ? byId.name : val
}
