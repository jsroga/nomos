/**
 * Generic Mention System Types
 *
 * Extensible types for @ mention functionality across all chat implementations.
 * Supports three categories: Entities, Agents, and Sections.
 */

import {
  CATEGORY_META,
  MentionCategoryId,
  TYPE_ICONS,
} from '../constants/mention-types'

export type MentionCategory = `${MentionCategoryId}`

export { MentionCategoryId, CATEGORY_META, TYPE_ICONS }

/**
 * A mentionable item that can be referenced in chat
 */
export interface MentionItem {
  /** Unique identifier */
  id: string
  /** Display name (what user sees and types) */
  name: string
  /** Category for grouping in popover */
  category: MentionCategory
  /** Specific type within category (e.g., 'character', 'writer', 'worldRules') */
  type: string
  /** Lucide icon name for visual display */
  icon?: string
  /** Short preview text shown in popover */
  preview?: string
  /** Full data to inject into message context */
  context?: unknown
}

/**
 * Provider interface for domain-specific mention sources
 */
export interface MentionProvider {
  /** Category this provider handles */
  category: MentionCategory
  /** Get items matching the filter string (sync or async — consumers await via Promise.all) */
  getItems: (
    filter: string,
    projectContext: ProjectContext,
    signal?: AbortSignal,
  ) => MentionItem[] | Promise<MentionItem[]>
}

/**
 * Project context passed to providers for data access
 */
export interface ProjectContext {
  projectId: string
  registryEntities?: Array<{
    id: string
    name: string
    type: string
    description?: string
    metadata?: Record<string, unknown>
  }>
  // Storyteller-specific. These accept both nominal domain types (characters,
  // beats) and loosely-parsed JSON (seriesBible sections), so identifying
  // fields stay optional and the JSON-sourced arrays carry index signatures.
  characters?: Array<{
    id: string
    name: string
    role?: string
    description?: string
  }>
  episodes?: Array<{ id: string; title?: string; number?: number; [key: string]: unknown }>
  beats?: Array<{ id: string; logline?: string; sequence?: number }>
  factions?: Array<{ id?: string; name?: string; ideology?: string; [key: string]: unknown }>
  seriesBible?: {
    worldRules?: Array<{
      category?: string
      rule?: string
      consequence?: string
      [key: string]: unknown
    }>
    inspirations?: { books?: Array<unknown>; movies?: Array<unknown>; games?: Array<unknown>; [key: string]: unknown }
    soundtracks?: Array<{
      title?: string
      artist?: string
      youtubeUrl?: string
      [key: string]: unknown
    }>
    plotTwists?: string[]
    [key: string]: unknown
  }
  // Loop Creator-specific
  mechanics?: Array<{
    id: string
    name: string
    type?: string
    description?: string
    [key: string]: unknown
  }>
  loops?: Array<{
    id: string
    name: string
    type?: string
    description?: string
    [key: string]: unknown
  }>
  connections?: Array<{ id: string; source: string; target: string; [key: string]: unknown }>
  balanceAnalysis?: unknown
  gameContext?: {
    genre?: string
    platform?: string
    targetAudience?: string
    [key: string]: unknown
  }
}

/**
 * Selected mention for tracking in input
 */
export interface SelectedMention {
  item: MentionItem
  /** Position in input where @ was typed */
  startIndex: number
  /** Position after the mention name */
  endIndex: number
}
