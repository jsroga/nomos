/**
 * Context Builder for Mentions
 *
 * Transforms selected mentions into XML context that gets prepended to user messages.
 * This allows the AI to have full context about referenced entities, agents, and sections.
 */

import { MentionItem, SelectedMention } from './types'

/**
 * Build XML context string from selected mentions
 */
export function buildMentionContext(mentions: MentionItem[]): string {
  if (mentions.length === 0) return ''

  const parts: string[] = ['<mentioned_context>']

  // Group by category
  const entities = mentions.filter(m => m.category === 'entity')
  const agents = mentions.filter(m => m.category === 'agent')
  const sections = mentions.filter(m => m.category === 'section')

  // Entities with full context
  for (const entity of entities) {
    const contextJson = entity.context ? JSON.stringify(entity.context, null, 2) : '{}'
    parts.push(`  <entity type="${entity.type}" name="${escapeXml(entity.name)}">`)
    parts.push(`    ${contextJson}`)
    parts.push('  </entity>')
  }

  // Agents (routing hints)
  for (const agent of agents) {
    parts.push(`  <agent name="${escapeXml(agent.name)}" type="${agent.type}" />`)
  }

  // Sections with content
  for (const section of sections) {
    const contextJson = section.context ? JSON.stringify(section.context, null, 2) : '[]'
    parts.push(`  <section type="${section.type}" name="${escapeXml(section.name)}">`)
    parts.push(`    ${contextJson}`)
    parts.push('  </section>')
  }

  parts.push('</mentioned_context>')

  return parts.join('\n')
}

/**
 * Build the final message with injected context
 */
export function buildMessageWithContext(
  userMessage: string,
  selectedMentions: SelectedMention[]
): string {
  const uniqueMentions = deduplicateMentions(selectedMentions.map(sm => sm.item))
  const context = buildMentionContext(uniqueMentions)

  if (!context) return userMessage

  return `${context}\n\n${userMessage}`
}

/**
 * Remove duplicate mentions (same id)
 */
function deduplicateMentions(mentions: MentionItem[]): MentionItem[] {
  const seen = new Set<string>()
  return mentions.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
