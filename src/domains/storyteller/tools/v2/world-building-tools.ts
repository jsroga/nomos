/**
 * World Building Tools - Mastra v2
 *
 * Tools for updating the Series Bible / World Bible.
 */

import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { db } from '@/lib/db'
import { projects } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { deepMerge } from '../../config/action-config'
import { getErrorMessage } from '@/lib/error-utils'

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

export const updateWorldBibleTool = createTool({
  id: 'update_world_bible',
  description:
    'Update the Series Bible (World Bible) with new details about the setting, lore, factions, or magic system.',
  inputSchema: z
    .object({
      projectId: z.string(),
      // All other fields are optional and allowed via passthrough
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

    const finalUpdates = normalizeUpdates(parseResult.data)

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
