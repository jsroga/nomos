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
import {
  ConsistencyCheckKind,
  isConsistencyCheckKind,
} from '@/domains/storyteller/services/consistency-types'
import { parseStoryPlanRecord } from '@/domains/storyteller/core/io/project-jsonb'
import { resolveRoadmapList } from '@/domains/storyteller/core/utils/roadmap-slot'
import {
  STORYTELLER_PROJECT_ID,
  STORYTELLER_EPISODE_ID,
  STORYTELLER_BIBLE_SECTION,
  STORYTELLER_PREMISE_FIELD,
  requestContextString,
} from '@/domains/storyteller/ai/request-context'
import { filterUpdatesForBibleSection, emptyBibleSectionError } from '@/domains/storyteller/ai/tools/bible-section-allowlist'
import {
  BibleToolError,
  BibleToolLog,
  BibleToolMessage,
  BibleEpisodePremiseError,
  BIBLE_TOOL_PROJECT_ID_DESC,
  proposedFieldsFromInput,
  resolveSoundtrackLinks,
  applyPremiseFieldNarrowing,
} from '@/domains/storyteller/ai/tools/bible-tools-update'

// ==========================================
// SCHEMAS
// ==========================================

const UpdateWorldBibleInputSchema = z.object({
  projectId: z.string().uuid().optional().describe(BIBLE_TOOL_PROJECT_ID_DESC),
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
  soundtracks: z
    .array(
      z.object({
        title: z.string(),
        artist: z.string(),
        youtubeUrl: z.string(),
        mood: z.string().optional(),
      })
    )
    .optional()
    .describe(
      'Give the real song title and artist — the YouTube link is resolved by searching for them, so youtubeUrl is replaced and does not need to be a real id. Regenerating REPLACES the whole soundtrack list.'
    ),
  moodSoundtrack: z
    .string()
    .optional()
    .describe('One-line description of the overall musical mood — never use this for inspirations'),
  inspirations: z
    .object({
      books: z
        .array(z.object({ title: z.string(), description: z.string() }))
        .optional(),
      movies: z
        .array(z.object({ title: z.string(), description: z.string() }))
        .optional(),
      games: z
        .array(z.object({ title: z.string(), description: z.string() }))
        .optional(),
    })
    .optional()
    .describe(
      'Books, movies, and games that inspire the world — use this for any inspirations request'
    ),
  episodeRoadmap: z
    .record(z.unknown())
    .optional()
    .describe('Season / episode roadmap for the series bible'),
  episodePremise: z
    .record(z.unknown())
    .optional()
    .describe(
      'Partial Ozymandias object for the open episode. Episode description / logline → { logline } only. Full object only when the user asked for a premise or Ozymandias.'
    ),
})

const ReadWorldBibleInputSchema = z.object({
  projectId: z.string().uuid().optional().describe(BIBLE_TOOL_PROJECT_ID_DESC),
  sections: z
    .array(
      z.enum([
        'worldDescription',
        'items',
        'events',
        'factions',
        'worldRules',
        'plotTwists',
        'soundtracks',
        'inspirations',
        'episodeRoadmap',
        'all',
      ])
    )
    .optional()
    .default(['all'])
    .describe('Which sections to read'),
})

const CheckContinuityInputSchema = z.object({
  projectId: z.string().uuid().optional().describe(BIBLE_TOOL_PROJECT_ID_DESC),
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
  soundtracks: z.array(z.record(z.unknown())).optional(),
  inspirations: z.record(z.unknown()).optional(),
  episodeRoadmap: z.record(z.unknown()).optional(),
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
    'Propose Series Bible (World Bible) updates for the user to Accept or Add to world. Does not persist until they confirm.',
  inputSchema: UpdateWorldBibleInputSchema,
  outputSchema: UpdateWorldBibleOutputSchema,
  execute: async (inputData, context) => {
    // Server-trusted request-context IDs beat model-supplied input.
    const projectId =
      requestContextString(context.requestContext, STORYTELLER_PROJECT_ID) ?? inputData.projectId
    const bibleSection = requestContextString(
      context.requestContext,
      STORYTELLER_BIBLE_SECTION
    )
    const episodeId = requestContextString(context.requestContext, STORYTELLER_EPISODE_ID)

    try {
      if (!projectId) {
        return { success: false, error: BibleToolError.ProjectIdRequired }
      }
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

      if (!project) {
        return {
          success: false,
          error: `Project ${projectId} not found`,
        }
      }

      const proposed = await resolveSoundtrackLinks(
        applyPremiseFieldNarrowing(
          proposedFieldsFromInput({ ...inputData }),
          requestContextString(context.requestContext, STORYTELLER_PREMISE_FIELD),
        )
      )
      const { updates, dropped } = filterUpdatesForBibleSection(proposed, bibleSection)
      if (dropped.length > 0) {
        console.warn(
          `${BibleToolLog.OffSectionFields}${bibleSection ?? '(none)'}: ${dropped.join(', ')}`
        )
      }
      const updatedFields = Object.keys(updates)
      if (updatedFields.length === 0) {
        return {
          success: false,
          error: emptyBibleSectionError(bibleSection),
        }
      }

      const premiseValue = updates.episodePremise
      if (premiseValue !== undefined) {
        if (!episodeId) {
          return {
            success: false,
            error: BibleEpisodePremiseError.EpisodeIdRequired,
          }
        }
        if (typeof premiseValue !== 'object' || premiseValue === null || Array.isArray(premiseValue)) {
          return {
            success: false,
            error: BibleToolError.NoFields,
          }
        }
      }

      return {
        success: true,
        message: `${BibleToolMessage.ProposedPrefix}${updatedFields.length}${BibleToolMessage.ProposedSuffix}`,
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
      if (!projectId) {
        return { success: false }
      }
      const [project] = await db.select().from(projects).where(eq(projects.id, projectId))

      if (!project) {
        return {
          success: false,
        }
      }

      const storyPlan = parseStoryPlanRecord(project.storyPlan)

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
      if (shouldInclude('soundtracks')) result.soundtracks = recordArray(storyPlan.soundtracks)
      if (shouldInclude('inspirations') && isObjectLike(storyPlan.inspirations)) {
        result.inspirations = storyPlan.inspirations
      }
      if (shouldInclude('episodeRoadmap')) {
        result.episodeRoadmap = { episodes: resolveRoadmapList(storyPlan) }
      }

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
      if (!projectId) {
        return { success: false, issues: [], message: BibleToolError.ProjectIdRequired }
      }
      // Import ConsistencyService dynamically to avoid circular deps
      const { runConsistencyCheck } = await import(
        '@/domains/storyteller/services/consistency-service'
      )

      const normalizedCheckTypes = (checkTypes ?? ['all']).filter(isConsistencyCheckKind)
      const result = await runConsistencyCheck({
        projectId,
        episodeId,
        beatIds,
        checkTypes: normalizedCheckTypes.length > 0 ? normalizedCheckTypes : [ConsistencyCheckKind.ALL],
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
