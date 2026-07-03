/**
 * World Building Tools - Mastra v2
 *
 * Tools for updating the Series Bible / World Bible.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { characters, projects } from '@/db'
import { db } from '@/db/client'
import { eq, and } from 'drizzle-orm'
import { deepMerge } from '@/domains/storyteller/config/action-config'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { ReferenceValidator } from '@/domains/storyteller/services/ReferenceValidatorService'
import { getEntityLinkRequirements } from '@/domains/storyteller/config/storyteller-config'
import { parseReferences } from '@/domains/storyteller/core/entities/ReferenceParser'

/** After this many rejections for worldDescription link count, next attempt is accepted to stop loops. */
const WORLD_DESC_REJECTION_ACCEPT_AFTER = 2
const worldDescRejectionByProject = new Map<string, { count: number; resetAt: number }>()
const WORLD_DESC_REJECTION_TTL_MS = 120_000

/**
 * Parse and validate tool arguments for Mastra compatibility
 */
function parseToolArgs(
  args: any
): { success: false; error: string } | { success: true; data: Record<string, any> } {
  if (!args) {
    return { success: false, error: 'No arguments provided to update_world_bible' }
  }

  // Mastra 1.x passes args directly, not wrapped in { context }
  const context = args.context || args

  if (!context || typeof context !== 'object') {
    return { success: false, error: 'Invalid arguments: expected object with projectId' }
  }

  return { success: true, data: context }
}

/**
 * Clean and normalize update payload
 */
function normalizeUpdates(raw: Record<string, any>): Record<string, any> {
  const { projectId, category, ...updatesToMerge } = raw

  // Unwrap if LLM wrapped updates in an 'updates' object (common mistake)
  const contentUpdates = { ...updatesToMerge }
  if (
    contentUpdates.updates &&
    typeof contentUpdates.updates === 'object' &&
    !Array.isArray(contentUpdates.updates)
  ) {
    Object.assign(contentUpdates, contentUpdates.updates)
    delete contentUpdates.updates
  }

  // Filter out undefined/null values
  return Object.entries(contentUpdates).reduce(
    (acc, [k, v]) => {
      if (v !== undefined && v !== null) acc[k] = v
      return acc
    },
    {} as Record<string, any>
  )
}

const CharacterSchema = z.object({
  name: z.string().describe('Full name of the character'),
  role: z.string().describe('Role in the story (Protagonist, Antagonist, etc.)'),
  gender: z.string().describe('Gender identity'),
  description: z.string().describe('Physical and personality description'),
  archetype: z.string().optional().describe('Jungian archetype'),
  mbti: z.string().describe('MBTI personality type'),
  voiceSignature: z.string().optional().describe('Distinctive speaking style'),
  motivation: z.string().optional().describe('Public motivation'),
  fatalFlaw: z.string().optional().describe('Critical weakness'),
  psychology: z.object({
    actualMotivation: z.string().optional(),
    fears: z.string().optional(),
    desires: z.string().optional(),
    delusions: z.string().optional(),
    secrets: z.string().optional(),
  }).optional().describe('Deep psychological profile'),
})

const _linkReqs = getEntityLinkRequirements()

export const updateWorldBibleTool = createTool({
  id: 'update_world_bible',
  description:
    'Update the Series Bible (World Bible) with new details about the setting, lore, factions, or magic system.',
  inputSchema: z
    .object({
      projectId: z.string(),
      worldDescription: z.string().optional().describe(`The narrative description of the world. CRITICAL: The worldDescription TEXT ITSELF (the prose paragraphs) must contain at least ${_linkReqs.minItems} [Name][item-id], ${_linkReqs.minEvents} [Name][event-id], and ${_linkReqs.minRules} [Name][rule-id] woven into the narrative. Separate items/events/worldRules arrays or lists do NOT count—only links inside this worldDescription string count. Weave entities into sentences (e.g. "The [Mushroom Drum][item-1] and [Spore Lantern][item-2]..."). If you create new entities, also pass items/events/worldRules arrays and use their IDs in the worldDescription text.`),
      cast: z.array(CharacterSchema).optional().describe('List of characters to add or update'),
      items: z.array(z.object({
        name: z.string().describe('Name of the item'),
        description: z.string().describe('Description of the item'),
      })).optional().describe('Significant items, artifacts or objects. If generating new ones, YOU MUST generate exactly 3-5 items.'),
      events: z.array(z.object({
        name: z.string().describe('Name of the event'),
        description: z.string().describe('Description of the event'),
      })).optional().describe('Key historical or world events. If generating new ones, YOU MUST generate exactly 3-5 events.'),
      factions: z.array(z.object({
        name: z.string().optional(),
        description: z.string().optional(),
      }).passthrough()).optional().describe('Major factions, power structures. If generating new ones, YOU MUST generate exactly 3-5 factions.'),
      plotTwists: z.array(z.object({
        title: z.string().optional(),
        description: z.string().optional(),
      }).passthrough()).optional().describe('Major plot twists. If generating new ones, YOU MUST generate exactly 3-5 twists.'),
      worldRules: z.array(z.object({
        rule: z.string().optional(),
        consequence: z.string().optional(),
      }).passthrough()).optional().describe('Fundamental laws and rules. If generating new ones, YOU MUST generate exactly 3-5 rules.'),
      soundtracks: z.array(z.object({
        title: z.string().optional(),
        artist: z.string().optional(),
        url: z.string().optional(),
      }).passthrough()).optional().describe('Soundtrack recommendations from YouTube. If generating new ones, YOU MUST generate exactly 3-5 soundtracks.'),
      inspirations: z.object({
        books: z.array(z.record(z.unknown())).optional(),
        movies: z.array(z.record(z.unknown())).optional(),
        games: z.array(z.record(z.unknown())).optional(),
      }).passthrough().optional().describe('Inspirations (books, movies, games). If generating new ones, YOU MUST generate exactly 3-5 inspirations.'),
      episodeRoadmap: z.record(z.unknown()).optional().describe(`The episode roadmap. MUST weave in AT LEAST ${_linkReqs.minItems} ITEM LINKS [Name][item-id], ${_linkReqs.minEvents} EVENT LINKS [Name][event-id], and ${_linkReqs.minRules} RULE LINKS [Name][rule-id].`),
      // All other fields are allowed via passthrough
    })
    .passthrough(),
  execute: async (args: any) => {
    // Parse arguments
    const parseResult = parseToolArgs(args)
    if (!parseResult.success) {
      return JSON.stringify({ success: false, error: parseResult.error })
    }

    const { projectId, category } = parseResult.data

    if (!projectId) {
      console.error(
        '[update_world_bible] Missing projectId. Args received:',
        JSON.stringify(args, null, 2).slice(0, 500)
      )
      return JSON.stringify({ success: false, error: 'Missing required projectId parameter' })
    }

    // Validate references before saving
    const validatedData = await ReferenceValidator.validateObject(parseResult.data, projectId)
    const finalUpdates = normalizeUpdates(validatedData)

    // HARD GATE: only links inside the worldDescription prose count; after N rejections we accept to stop loops
    const worldDesc = finalUpdates.worldDescription
    if (typeof worldDesc === 'string' && worldDesc.length > 0) {
      const refs = parseReferences(worldDesc)
      const itemIds = new Set(refs.filter(r => r.refId.startsWith('item-')).map(r => r.refId))
      const eventIds = new Set(refs.filter(r => r.refId.startsWith('event-')).map(r => r.refId))
      const ruleIds = new Set(refs.filter(r => r.refId.startsWith('rule-')).map(r => r.refId))
      const reqs = getEntityLinkRequirements()
      const missing: string[] = []
      if (itemIds.size < reqs.minItems) missing.push(`${reqs.minItems} ITEM links [Name][item-id] (found ${itemIds.size})`)
      if (eventIds.size < reqs.minEvents) missing.push(`${reqs.minEvents} EVENT links [Name][event-id] (found ${eventIds.size})`)
      if (ruleIds.size < reqs.minRules) missing.push(`${reqs.minRules} RULE links [Name][rule-id] (found ${ruleIds.size})`)
      const now = Date.now()
      const entry = worldDescRejectionByProject.get(projectId)
      const rejectCount = entry && entry.resetAt > now ? entry.count : 0
      if (missing.length > 0) {
        if (rejectCount >= WORLD_DESC_REJECTION_ACCEPT_AFTER) {
          worldDescRejectionByProject.delete(projectId)
          // Accept this attempt to stop loop; fall through to save below
        } else {
          const nextCount = rejectCount + 1
          worldDescRejectionByProject.set(projectId, { count: nextCount, resetAt: now + WORLD_DESC_REJECTION_TTL_MS })
          const stopHint =
            nextCount >= WORLD_DESC_REJECTION_ACCEPT_AFTER
              ? ' Your next attempt will be ACCEPTED automatically—then respond to the user and do not call update_world_bible again.'
              : ' Retry at most once; if rejected again, your next attempt will be accepted.'
          const msg = `REJECTED: worldDescription does not meet required entity link minimums. Only links INSIDE the worldDescription narrative text count. You must add: ${missing.join('; ')} woven INTO the prose (e.g. "The [Mushroom Drum][item-1] and [Spore Lantern][item-2] lit the way during [Festival of Sporefall][event-1]..."). Use [Entity Name][entity-id] in the worldDescription string.${stopHint}`
          return JSON.stringify({ success: false, error: msg })
        }
      } else {
        worldDescRejectionByProject.delete(projectId)
      }
    }

    try {
      // Fetch existing project with retry logic for connection stability
      let project
      let retries = 3
      while (retries > 0) {
        try {
          const result = await db.select().from(projects).where(eq(projects.id, projectId))
          project = result[0]
          break
        } catch (err: unknown) {
          retries--
          if (retries === 0) throw err
          console.log(`[update_world_bible] DB error (retrying... ${retries} left):`, getErrorMessage(err))
          await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1s
        }
      }

      if (!project) {
        throw new Error(`Project ${projectId} not found`)
      }

      const currentStoryPlan = (project.storyPlan as Record<string, any>) || {}

      // MIGRATION STRATEGY: Everything goes to Story Plan
      const storyPlanUpdates: Record<string, any> = {}
      let keysUpdated: string[] = []

      // Helper to merge updates into storyPlan
      const mergeToStoryPlan = (key: string, value: any) => {
        // Map aliases and normalize keys
        let targetKey = key

        // 1. Flatten Setting fields to root
        if (key === 'Setting') {
          if (typeof value === 'object' && value !== null) {
            Object.entries(value).forEach(([k, v]) => mergeToStoryPlan(k, v))
          }
          return
        }

        // 2. Lowercase common Bible categories
        if (key === 'Lore') targetKey = 'lore'

        // 3. Map common aliases
        if (key === 'characters') targetKey = 'keyCharacters'
        if (key === 'cast') targetKey = 'keyCharacters'
        if (key === 'key_characters') targetKey = 'keyCharacters'
        if (key === 'episodes') targetKey = 'sequences'

        storyPlanUpdates[targetKey] = value
        keysUpdated.push(targetKey)
      }

      if (category) {
        // Handle categorized updates
        if (category === 'Setting') {
          // Flatten Setting category updates to root
          Object.entries(finalUpdates).forEach(([k, v]) => mergeToStoryPlan(k, v))
        } else if (category === 'Lore') {
          // Map Lore to lore
          storyPlanUpdates['lore'] = deepMerge(currentStoryPlan['lore'] || {}, finalUpdates)
          keysUpdated.push('lore')
        } else {
          // Default behavior: update the category root in storyPlan (or create it)

          const knownRoots = ['factions', 'worldRules', 'keyCharacters', 'sequences', 'moodImages']
          if (knownRoots.includes(category)) {
            storyPlanUpdates[category] = finalUpdates
            keysUpdated.push(category)
          } else {
            // Fallback: nested object update
            storyPlanUpdates[category] = deepMerge(currentStoryPlan[category] || {}, finalUpdates)
            keysUpdated.push(category)
          }
        }
      } else {
        // Root updates
        Object.entries(finalUpdates).forEach(([key, value]) => {
          mergeToStoryPlan(key, value)
        })
      }

      // SYNC: If keyCharacters/cast are present, sync to characters table
      const charsToSync = storyPlanUpdates.keyCharacters || storyPlanUpdates.cast || storyPlanUpdates.key_characters
      if (charsToSync && Array.isArray(charsToSync)) {
        console.log(`[update_world_bible] Syncing ${charsToSync.length} characters to DB...`)

        for (const char of charsToSync) {
          if (!char.name) continue

          try {
            // Check existence by name + projectId
            const existing = await db
              .select()
              .from(characters)
              .where(and(eq(characters.projectId, projectId), eq(characters.name, char.name)))
              .limit(1)

            // Build full psychology object from all available fields
            const buildPsychology = (existingPsych: any = {}) => ({
              ...existingPsych,
              ...(char.archetype ? { archetype: char.archetype } : {}),
              ...(char.motivation ? { actualMotivation: char.motivation } : {}),
              ...(char.fatalFlaw ? { fatalFlaw: char.fatalFlaw } : {}),
              ...(char.psychology && typeof char.psychology === 'object' ? char.psychology : {}),
            })

            if (existing.length > 0) {
              const current = existing[0]
              await db
                .update(characters)
                .set({
                  role: char.role || current.role,
                  description: char.description || current.description,
                  gender: char.gender || current.gender,
                  mbti: char.mbti || current.mbti,
                  voiceSignature: char.voiceSignature || char.voice_signature || current.voiceSignature,
                  psychology: buildPsychology((current.psychology as any) || {}),
                  updatedAt: new Date(),
                })
                .where(eq(characters.id, current.id))
            } else {
              await db.insert(characters).values({
                projectId,
                name: char.name,
                role: char.role || 'Supporting',
                description: char.description || '',
                gender: char.gender,
                mbti: char.mbti,
                voiceSignature: char.voiceSignature || char.voice_signature,
                psychology: buildPsychology(),
                valence: 0,
                arousal: 50,
                autonomy: 50,
                competence: 50,
                relatedness: 50,
              })
            }
          } catch (err) {
            console.error(`[update_world_bible] Failed to sync character ${char.name}:`, err)
          }
        }
      }

      // Prepare DB Updates
      const dbSet: Record<string, any> = {
        updatedAt: new Date(),
        storyPlan: deepMerge(currentStoryPlan, storyPlanUpdates),
      }

      // We do NOT update seriesBible anymore. It is deprecated.

      // Update project
      await db.update(projects).set(dbSet).where(eq(projects.id, projectId))

      return JSON.stringify({
        success: true,
        message: 'Updated Story Plan successfully.',
        updatedCount: keysUpdated.length,
        keys: keysUpdated,
        // Return clean updates, no wrappers
        updatedFields: storyPlanUpdates,
      })
    } catch (error) {
      console.error('Failed to update world bible:', error)
      return JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown DB error',
      })
    }
  },
})

export const worldBuildingTools = [updateWorldBibleTool]
