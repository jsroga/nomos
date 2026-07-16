/**
 * World Bible Tools - GRRM Solo Model
 *
 * Tools for updating the Series Bible and checking continuity.
 * Consolidates the 4 consistency variants into checkContinuityTool.
 */

import '@/shared/data/server-guard'
import { createTool } from '@mastra/core/tools'
import { z } from 'zod'
import { projects } from '@/db/schema'
import { db } from '@/db/client'
import { eq } from 'drizzle-orm'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { countOccurrences } from '@/shared/data/count-occurrences'
import { deepMergeRecords, recordFromJson } from '@/shared/data/deep-merge'
import {
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'

// ==========================================
// SCHEMAS
// ==========================================

const UpdateWorldBibleInputSchema = z.object({
  projectId: z.string().uuid().describe('Project ID'),
  worldDescription: z.string().optional().describe('Narrative description of the world setting'),
  items: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      })
    )
    .optional()
    .describe('Significant items, artifacts, or objects'),
  events: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      })
    )
    .optional()
    .describe('Key historical or world events'),
  factions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
      })
    )
    .optional()
    .describe('Major factions or power structures'),
  worldRules: z
    .array(
      z.object({
        rule: z.string(),
        consequence: z.string().optional(),
      })
    )
    .optional()
    .describe('Fundamental laws and rules of the world'),
  plotTwists: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
      })
    )
    .optional()
    .describe('Major plot twists'),
})

const ReadWorldBibleInputSchema = z.object({
  projectId: z.string().uuid().describe('Project ID'),
  sections: z
    .array(z.enum(['worldDescription', 'items', 'events', 'factions', 'worldRules', 'plotTwists', 'all']))
    .optional()
    .default(['all'])
    .describe('Which sections to read'),
})

const CheckContinuityInputSchema = z.object({
  projectId: z.string().uuid().describe('Project ID'),
  episodeId: z.string().uuid().optional().describe('Episode ID to check (optional)'),
  beatIds: z.array(z.string().uuid()).optional().describe('Specific beat IDs to check'),
  checkTypes: z
    .array(z.enum(['world_rules', 'character_knowledge', 'setup_payoff', 'timeline', 'all']))
    .optional()
    .default(['all'])
    .describe('Types of continuity checks to perform'),
})

// ==========================================
// OUTPUT SCHEMAS
// ==========================================

const UpdateWorldBibleOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  error: z.string().optional(),
  updatedFields: z.array(z.string()).optional(),
})

const ReadWorldBibleOutputSchema = z.object({
  success: z.boolean(),
  worldDescription: z.string().optional(),
  items: z.array(z.record(z.unknown())).optional(),
  events: z.array(z.record(z.unknown())).optional(),
  factions: z.array(z.record(z.unknown())).optional(),
  worldRules: z.array(z.record(z.unknown())).optional(),
  plotTwists: z.array(z.record(z.unknown())).optional(),
})

const ContinuityIssueSchema = z.object({
  type: z.enum(['contradiction', 'timeline', 'character', 'missing_payoff', 'orphaned_setup', 'knowledge_violation']),
  severity: z.enum(['critical', 'major', 'minor']),
  description: z.string(),
  location: z.string(),
  affectedElements: z.array(z.string()),
  suggestion: z.string().optional(),
})

const CheckContinuityOutputSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  issues: z.array(ContinuityIssueSchema),
  summary: z
    .object({
      beatsChecked: z.number(),
      issuesFound: z.number(),
      critical: z.number(),
      major: z.number(),
      minor: z.number(),
    })
    .optional(),
})

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Coerce a JSON value to an array of records (malformed entries dropped). */
function recordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter(isObjectLike) : []
}

// ==========================================
// TOOLS
// ==========================================

/**
 * Update the World Bible with new lore, rules, and world-building details
 */
export const updateWorldBibleTool = createTool({
  id: 'update_world_bible',
  description:
    'Update the Series Bible (World Bible) with new details about the setting, lore, factions, or world rules. All updates are merged into storyPlan.',
  inputSchema: UpdateWorldBibleInputSchema,
  outputSchema: UpdateWorldBibleOutputSchema,
  execute: async (inputData, context) => {
    const { worldDescription, items, events, factions, worldRules, plotTwists } = inputData
    // Server-trusted request-context IDs beat model-supplied input.
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId

    try {
      // Fetch existing project
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

      if (!project) {
        return {
          success: false,
          error: `Project ${projectId} not found`,
        }
      }

      const currentStoryPlan = recordFromJson(project.storyPlan)
      const updates: Record<string, unknown> = {}
      const updatedFields: string[] = []

      // Update each section if provided
      if (worldDescription !== undefined) {
        updates.worldDescription = worldDescription
        updatedFields.push('worldDescription')
      }
      if (items !== undefined) {
        updates.items = items
        updatedFields.push('items')
      }
      if (events !== undefined) {
        updates.events = events
        updatedFields.push('events')
      }
      if (factions !== undefined) {
        updates.factions = factions
        updatedFields.push('factions')
      }
      if (worldRules !== undefined) {
        updates.worldRules = worldRules
        updatedFields.push('worldRules')
      }
      if (plotTwists !== undefined) {
        updates.plotTwists = plotTwists
        updatedFields.push('plotTwists')
      }

      // Merge updates into storyPlan
      const updatedStoryPlan = deepMergeRecords(currentStoryPlan, updates)

      await db
        .update(projects)
        .set({
          storyPlan: updatedStoryPlan,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))

      return {
        success: true,
        message: `Updated Story Plan successfully (${updatedFields.length} sections)`,
        updatedFields,
      }
    } catch (error) {
      return {
        success: false,
        error: getErrorMessage(error),
      }
    }
  },
})

/**
 * Read sections from the World Bible
 */
export const readWorldBibleTool = createTool({
  id: 'read_world_bible',
  description: 'Read the World Bible to check world rules, lore, factions, and events.',
  inputSchema: ReadWorldBibleInputSchema,
  outputSchema: ReadWorldBibleOutputSchema,
  execute: async (inputData, context) => {
    const { sections } = inputData
    // Server-trusted request-context IDs beat model-supplied input.
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId

    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

      if (!project) {
        return {
          success: false,
        }
      }

      const storyPlan = recordFromJson(project.storyPlan)

      const requested = new Set<string>(sections)
      const shouldInclude = (section: string) => requested.has('all') || requested.has(section)

      const result: z.infer<typeof ReadWorldBibleOutputSchema> = { success: true }
      if (shouldInclude('worldDescription') && typeof storyPlan.worldDescription === 'string') {
        result.worldDescription = storyPlan.worldDescription
      }
      if (shouldInclude('items')) result.items = recordArray(storyPlan.items)
      if (shouldInclude('events')) result.events = recordArray(storyPlan.events)
      if (shouldInclude('factions')) result.factions = recordArray(storyPlan.factions)
      if (shouldInclude('worldRules')) result.worldRules = recordArray(storyPlan.worldRules)
      if (shouldInclude('plotTwists')) result.plotTwists = recordArray(storyPlan.plotTwists)

      return result
    } catch (_error) {
      return {
        success: false,
      }
    }
  },
})

/**
 * Check continuity across beats, characters, and timeline
 * Consolidates the 4 consistency variants (checkContinuity, quickConsistencyCheck, validateConsistency, consultConsistency)
 * Delegates to ConsistencyService
 */
export const checkContinuityTool = createTool({
  id: 'check_continuity',
  description:
    'Validate story consistency. Checks world rules, character knowledge, setup/payoff, timeline. Delegates to ConsistencyService for the actual logic.',
  inputSchema: CheckContinuityInputSchema,
  outputSchema: CheckContinuityOutputSchema,
  execute: async (inputData, context) => {
    const { beatIds, checkTypes } = inputData
    // Server-trusted request-context IDs beat model-supplied input.
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId
    const episodeId =
      requestContextString(context.requestContext, STORYTELLER_EPISODE_ID) ?? inputData.episodeId

    try {
      // Import ConsistencyService dynamically to avoid circular deps
      const { runConsistencyCheck } = await import(
        '@/domains/storyteller/services/consistency-service'
      )

      const result = await runConsistencyCheck({
        projectId,
        episodeId,
        beatIds,
        checkTypes: checkTypes || ['all'],
      })

      if (!result.ok) {
        return {
          success: false,
          message: result.error,
          issues: [],
        }
      }

      const { issues, summary } = result.value

      if (issues.length === 0) {
        return {
          success: true,
          message: `✅ No continuity issues found${summary ? ` (checked ${summary.beatsChecked} beats)` : ''}.`,
          issues: [],
          summary,
        }
      }

      const bySeverity = countOccurrences(issues.map(issue => issue.severity))
      const criticalCount = bySeverity.critical ?? 0
      const majorCount = bySeverity.major ?? 0
      const minorCount = bySeverity.minor ?? 0

      return {
        success: true,
        message: `Found ${issues.length} issue(s): ${criticalCount} critical, ${majorCount} major, ${minorCount} minor`,
        issues,
        summary: summary ?? {
          beatsChecked: 0,
          issuesFound: issues.length,
          critical: criticalCount,
          major: majorCount,
          minor: minorCount,
        },
      }
    } catch (error) {
      return {
        success: false,
        message: `Continuity check failed: ${getErrorMessage(error)}`,
        issues: [],
      }
    }
  },
})
