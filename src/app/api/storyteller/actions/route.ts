import { NextRequest, NextResponse } from 'next/server'
import { beats, characters, episodes, projects, seriesBibles, storyPlans } from '@/db'
import { db } from '@/db/client'
import { verifyEpisodeAccess, verifyProjectAccess } from '@/domains/storyteller/server'
import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '@/shared/auth/auth'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import {
  ActionApiResultType,
  ApiErrorMessage,
  CharacterRole,
  HttpHeader,
  HttpStatus,
  StringSeparator,
} from '@/shared/data/constants/protocol'
import { REFERENCE_DISPLAY_CAPTURE } from '@/domains/storyteller/core/entities/constants/reference-parser'
import { ActionType, BeatStatus, BeatType } from '@/domains/storyteller/core/types/Enums'
import { STORY_PLAN_FIELDS } from '@/domains/storyteller/config/action-config'

const storyPlanFieldKeys = new Set<string>(STORY_PLAN_FIELDS)
import { deepMergeRecords, recordFromJson } from '@/shared/data/deep-merge'
import { recordUserAction, flushObservability } from '@/shared/observability/observability'

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: ApiErrorMessage.UNAUTHORIZED }, { status: 401 })

    const body = await req.json()
    const { action, projectId, episodeId } = body

    if (!action || !action.type) {
      return NextResponse.json({ error: ApiErrorMessage.INVALID_ACTION }, { status: 400 })
    }

    // Verify access
    if (projectId && !(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: ApiErrorMessage.PROJECT_NOT_FOUND }, { status: 404 })
    }
    if (episodeId && !(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: ApiErrorMessage.EPISODE_NOT_FOUND }, { status: 404 })
    }

    console.log(`📥 Actions API: ${action.type} for project ${projectId}`)

    // Extract trace ID for Langfuse correlation (from headers or body)
    const traceId = req.headers.get(HttpHeader.TRACE_ID) || body.traceId || `action-${Date.now()}`

    // Record user action approval in Langfuse
    try {
      recordUserAction(traceId, {
        type: action.type,
        approved: true, // This route is for approved actions
        payload: action.payload,
        reasoning: body.reasoning,
      })
    } catch {
      /* ignore tracing errors */
    }

    const updateSeriesBible = async (updates: Record<string, unknown>) => {
      if (!projectId) throw new Error(ApiErrorMessage.PROJECT_ID_REQUIRED)

      const [existing] = await db
        .select()
        .from(seriesBibles)
        .where(eq(seriesBibles.projectId, projectId))
        .limit(1)

      const currentContent = recordFromJson(existing?.content)
      const updatedContent = deepMergeRecords(currentContent, updates)

      await db
        .insert(seriesBibles)
        .values({ projectId, content: updatedContent, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: seriesBibles.projectId,
          set: { content: updatedContent, updatedAt: new Date() },
        })

      await db
        .update(projects)
        .set({ seriesBible: updatedContent, updatedAt: new Date() })
        .where(eq(projects.id, projectId))

      return updatedContent
    }

    const updateStoryPlan = async (updates: Record<string, unknown>) => {
      if (!projectId) throw new Error(ApiErrorMessage.PROJECT_ID_REQUIRED)

      const [existing] = await db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .limit(1)

      const currentContent = recordFromJson(existing?.content)
      console.log(API_LOG_PREFIX.UPDATE_STORY_PLAN_BEFORE_KEYS, Object.keys(currentContent))
      const worldDescription = currentContent.worldDescription
      console.log(
        API_LOG_PREFIX.UPDATE_STORY_PLAN_BEFORE_WORLD,
        typeof worldDescription === 'string' ? worldDescription.slice(0, 80) : worldDescription
      )
      console.log(API_LOG_PREFIX.UPDATE_STORY_PLAN_INCOMING_KEYS, Object.keys(updates))
      const incomingWorldDescription = updates.worldDescription
      console.log(
        API_LOG_PREFIX.UPDATE_STORY_PLAN_INCOMING_WORLD,
        typeof incomingWorldDescription === 'string'
          ? incomingWorldDescription.slice(0, 80)
          : incomingWorldDescription
      )

      const updatedContent = deepMergeRecords(currentContent, updates)

      console.log(
        API_LOG_PREFIX.UPDATE_STORY_PLAN_AFTER_KEYS,
        Object.keys(updatedContent)
      )
      const mergedWorldDescription = updatedContent.worldDescription
      console.log(
        API_LOG_PREFIX.UPDATE_STORY_PLAN_AFTER_WORLD,
        typeof mergedWorldDescription === 'string'
          ? mergedWorldDescription.slice(0, 80)
          : mergedWorldDescription
      )

      await db
        .insert(storyPlans)
        .values({ projectId, content: updatedContent, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: updatedContent, updatedAt: new Date() },
        })

      console.log(API_LOG_PREFIX.UPDATE_STORY_PLAN_WRITE_COMPLETE)

      return updatedContent
    }

    switch (action.type) {
      case ActionType.UPDATE_SERIES_BIBLE: {
        const payload = { ...action.payload }

        const planUpdates: Record<string, unknown> = {}
        const bibleUpdates: Record<string, unknown> = {}

        // 1. Extract nested storyPlan if exists
        if (payload.storyPlan) {
          Object.assign(planUpdates, payload.storyPlan)
          delete payload.storyPlan
        }

        // 2. Separate top-level fields
        for (const key of Object.keys(payload)) {
          if (storyPlanFieldKeys.has(key)) {
            planUpdates[key] = payload[key]
          } else {
            bibleUpdates[key] = payload[key]
          }
        }

        let updatedBible = {}
        let updatedPlan = {}

        if (Object.keys(bibleUpdates).length > 0) {
          updatedBible = await updateSeriesBible(bibleUpdates)
        }

        if (Object.keys(planUpdates).length > 0) {
          updatedPlan = await updateStoryPlan(planUpdates)
        }

        // 4. Return combined result with correct structure for frontend
        // Frontend expects result.seriesBible to contain the properties
        const finalResult = {
          ...bibleUpdates,
          ...updatedBible,
          storyPlan: {
            ...planUpdates,
            ...updatedPlan,
          },
        }
        console.log(API_LOG_PREFIX.ACTIONS_API_SUCCESS, Object.keys(finalResult))

        return NextResponse.json({
          success: true,
          result: {
            type: ActionApiResultType.BIBLE_UPDATED,
            seriesBible: finalResult,
          },
        })
      }

      case ActionType.UPDATE_CAST: {
        console.log(API_LOG_PREFIX.ACTIONS_UPDATE_CAST_KEYS, Object.keys(action.payload || {}))
        if (action.payload.cast && Array.isArray(action.payload.cast))
          console.log(API_LOG_PREFIX.ACTIONS_UPDATE_CAST_LENGTH, action.payload.cast.length)
        if (action.payload.keyCharacters && Array.isArray(action.payload.keyCharacters))
          console.log(API_LOG_PREFIX.ACTIONS_UPDATE_CAST_KEY_CHARS, action.payload.keyCharacters.length)

        // cast is the project-level list of characters (Story Plan)
        const castData = action.payload.cast || action.payload.keyCharacters || action.payload.characters
        const updates = { cast: castData }
        console.log(`💾 [API] UPDATE_CAST - Saving ${updates.cast?.length} characters`)
        const updated = await updateStoryPlan(updates)

        // SYNC characters to the characters TABLE so CharacterPanel sees them
        if (Array.isArray(castData) && projectId) {
          console.log(`🔄 [API] UPDATE_CAST - Syncing ${castData.length} characters to characters table`)

          // Strip entity link markers [Text][entity-id] → Text
          const stripLinks = (value: unknown): string | undefined =>
            typeof value === 'string'
              ? value.replace(/\[([^\]]+)\]\[[^\]]+\]/g, REFERENCE_DISPLAY_CAPTURE)
              : undefined

          for (const rawCastEntry of castData) {
            const rawChar = recordFromJson(rawCastEntry)
            if (!rawChar.name) continue
            // Clean all string fields of entity link markers
            const char = {
              ...rawChar,
              name: stripLinks(rawChar.name),
              description: stripLinks(rawChar.description),
              motivation: stripLinks(rawChar.motivation),
              fatalFlaw: stripLinks(rawChar.fatalFlaw),
              voiceSignature: stripLinks(rawChar.voiceSignature || rawChar.voice_signature),
              archetype: stripLinks(rawChar.archetype),
              role: stripLinks(rawChar.role),
              gender: stripLinks(rawChar.gender),
              mbti: stripLinks(rawChar.mbti),
              ...(rawChar.psychology && typeof rawChar.psychology === 'object' ? {
                psychology: Object.fromEntries(
                  Object.entries(rawChar.psychology).map(([k, v]) => [k, stripLinks(v)])
                )
              } : {}),
            }
            if (!char.name) continue
            try {
              const existing = await db
                .select()
                .from(characters)
                .where(and(eq(characters.projectId, projectId), eq(characters.name, char.name)))
                .limit(1)

              if (existing.length > 0) {
                const current = existing[0]
                const buildPsychology = (existingPsych: Record<string, unknown> = {}) => ({
                  ...existingPsych,
                  ...(char.archetype ? { archetype: char.archetype } : {}),
                  ...(char.motivation ? { actualMotivation: char.motivation } : {}),
                  ...(char.fatalFlaw ? { fatalFlaw: char.fatalFlaw } : {}),
                  ...(char.psychology && typeof char.psychology === 'object' ? char.psychology : {}),
                })
                await db
                  .update(characters)
                  .set({
                    role: char.role || current.role,
                    description: char.description || current.description,
                    gender: char.gender || current.gender,
                    mbti: char.mbti || current.mbti,
                    voiceSignature: char.voiceSignature || current.voiceSignature,
                    psychology: buildPsychology(recordFromJson(current.psychology)),
                    updatedAt: new Date(),
                  })
                  .where(eq(characters.id, current.id))
              } else {
                const buildPsychology = () => ({
                  ...(char.archetype ? { archetype: char.archetype } : {}),
                  ...(char.motivation ? { actualMotivation: char.motivation } : {}),
                  ...(char.fatalFlaw ? { fatalFlaw: char.fatalFlaw } : {}),
                  ...(char.psychology && typeof char.psychology === 'object' ? char.psychology : {}),
                })
                await db.insert(characters).values({
                  projectId,
                  name: char.name,
                  role: char.role || CharacterRole.Supporting,
                  description: char.description || '',
                  gender: char.gender,
                  mbti: char.mbti,
                  voiceSignature: char.voiceSignature,
                  psychology: buildPsychology(),
                  valence: 0,
                  arousal: 50,
                  autonomy: 50,
                  competence: 50,
                  relatedness: 50,
                })
              }
            } catch (err) {
              console.error(`[API] UPDATE_CAST - Failed to sync character ${char.name}:`, err)
            }
          }
        }

        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.BIBLE_UPDATED, seriesBible: { storyPlan: updated }, characters_synced: true },
        })
      }

      case ActionType.UPDATE_WORLD_RULES:
      case ActionType.UPDATE_FACTIONS:
      case ActionType.UPDATE_INSPIRATIONS:
      case ActionType.UPDATE_WORLD_DESCRIPTION:
      case ActionType.UPDATE_PLOT_TWISTS:
      case ActionType.UPDATE_SOUNDTRACKS:
      case ActionType.ADD_WORLD_RULE: // Legacy
      case ActionType.ADD_THEME: // Legacy
      case ActionType.REMOVE_THEME: // Legacy
      case ActionType.SET_GENRE_AND_TONE: {
        // Legacy
        // Map legacy/specific payloads to generic partial update
        // Support both old format (rules) and new format (worldRules)
        let updates: Record<string, unknown> = {}
        if (action.type === ActionType.UPDATE_WORLD_RULES) {
          updates = { worldRules: action.payload.worldRules || action.payload.rules }
        } else if (action.type === ActionType.UPDATE_FACTIONS) {
          updates = { factions: action.payload.factions }
        } else if (action.type === ActionType.UPDATE_INSPIRATIONS) {
          updates = { inspirations: action.payload.inspirations }
        } else if (action.type === ActionType.UPDATE_WORLD_DESCRIPTION) {
          updates = {
            worldDescription: action.payload.worldDescription || action.payload.description,
          }
        } else if (action.type === ActionType.UPDATE_PLOT_TWISTS) {
          updates = { plotTwists: action.payload.plotTwists }
        } else if (action.type === ActionType.UPDATE_KEY_CHARACTERS) {
          updates = { keyCharacters: action.payload.keyCharacters || action.payload.characters }
        } else if (action.type === ActionType.ADD_WORLD_RULE) {
          const [proj] = await db
            .select()
            .from(storyPlans)
            .where(eq(storyPlans.projectId, projectId))
            .limit(1)
          const curr = recordFromJson(proj?.content)
          const currentRules = Array.isArray(curr.worldRules) ? curr.worldRules : []
          updates = { worldRules: [...currentRules, action.payload.rule] }
        } else if (action.type === ActionType.SET_GENRE_AND_TONE) {
          updates = {
            genre: action.payload.genre,
            tone: action.payload.tone,
            styleReference: action.payload.styleReference,
          }
        } else if (action.type === ActionType.UPDATE_SOUNDTRACKS)
          updates = { soundtracks: action.payload.soundtracks }

        // FIX: These fields belong to storyPlan, so we update the storyPlan table/column
        console.log(
          `💾 [API] ${action.type} - Saving updates:`,
          JSON.stringify(updates).slice(0, 200)
        )
        const updated = await updateStoryPlan(updates)
        console.log(`✅ [API] ${action.type} - Saved successfully. Keys:`, Object.keys(updated))
        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.BIBLE_UPDATED, seriesBible: { storyPlan: updated } },
        })
      }

      case ActionType.UPDATE_EPISODE_ROADMAP: {
        const payload = action.payload
        const updates: Record<string, unknown> = {}
        if (payload.sequences) updates.sequences = payload.sequences
        if (payload.seasonStructure) updates.seasonStructure = payload.seasonStructure
        if (payload.executiveSummary) updates.executiveSummary = payload.executiveSummary

        // Handle episodeRoadmap object (contains episodes list)
        if (payload.episodeRoadmap) {
          updates.episodeRoadmap = payload.episodeRoadmap
          // Also hoist seasonStructure/executiveSummary to top level if nested inside episodeRoadmap
          if (!updates.seasonStructure && payload.episodeRoadmap.seasonStructure) {
            updates.seasonStructure = payload.episodeRoadmap.seasonStructure
          }
          if (!updates.executiveSummary && payload.episodeRoadmap.executiveSummary) {
            updates.executiveSummary = payload.episodeRoadmap.executiveSummary
          }
          // Sync episodes to top-level sequences so displaySequences in BibleRoadmap can find it
          const episodes = payload.episodeRoadmap.episodes || payload.episodeRoadmap.sequences
          if (episodes && !updates.sequences) {
            updates.sequences = episodes
          }
        }

        const updatedPlan = await updateStoryPlan(updates)
        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.BIBLE_UPDATED, seriesBible: { storyPlan: updatedPlan } },
        })
      }

      case ActionType.UPDATE_ROADMAP_SUMMARY: {
        const updatedPlan = await updateStoryPlan({
          executiveSummary: action.payload.executiveSummary,
        })
        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.BIBLE_UPDATED, seriesBible: { storyPlan: updatedPlan } },
        })
      }

      case ActionType.UPDATE_EPISODE_PREMISE: {
        const { premise } = action.payload
        if (!episodeId) return NextResponse.json({ error: ApiErrorMessage.EPISODE_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })

        const [existing] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
        const existingPlan = recordFromJson(existing?.storyPlan)
        const newPlan = {
          ...existingPlan,
          premise: {
            ...recordFromJson(existingPlan.premise),
            ...premise,
          },
        }

        await db
          .update(episodes)
          .set({ storyPlan: newPlan, updatedAt: new Date() })
          .where(eq(episodes.id, episodeId))
        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.EPISODE_UPDATED, storyPlan: newPlan },
        })
      }

      case ActionType.CREATE_BEAT: {
        if (!episodeId) return NextResponse.json({ error: ApiErrorMessage.EPISODE_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
        const existingBeats = await db.select().from(beats).where(eq(beats.episodeId, episodeId))

        const newBeat = {
          id: uuidv4(),
          episodeId,
          sequence: existingBeats.length + 1,
          logline: action.payload.logline || '',
          content: action.payload.content || action.payload.description || '',
          beatType: action.payload.beatType || BeatType.COMPLICATION,
          status: BeatStatus.PROPOSED,
          charactersInvolved: action.payload.charactersInvolved || [],
          emotionalShifts: action.payload.emotionalShifts || {},
          visualHook: action.payload.visualHook || '',
          causalDependencies: action.payload.causalDependencies || [],
          setupsPayoffs: action.payload.setupsPayoffs || {},
          mazurElements: action.payload.mazurElements || null,
        }

        await db.insert(beats).values(newBeat)
        return NextResponse.json({ success: true, result: { type: ActionApiResultType.BEAT_CREATED, beat: newBeat } })
      }

      case ActionType.UPDATE_BEAT:
      case ActionType.UPDATE_BEAT_CONTENT: {
        const beatId = action.payload.beatId
        if (!beatId) return NextResponse.json({ error: API_ERROR.BEAT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
        const { beatId: _, ...updateData } = action.payload.updates || action.payload
        await db
          .update(beats)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(beats.id, beatId))
        return NextResponse.json({ success: true, result: { type: ActionApiResultType.BEAT_UPDATED, beatId } })
      }

      case ActionType.DELETE_BEAT: {
        const { beatId } = action.payload
        if (!beatId) return NextResponse.json({ error: API_ERROR.BEAT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })
        await db.delete(beats).where(eq(beats.id, beatId))
        return NextResponse.json({ success: true, result: { type: ActionApiResultType.BEAT_DELETED, beatId } })
      }

      case ActionType.REORDER_BEAT: {
        const { beatId, newIndex } = action.payload
        await db
          .update(beats)
          .set({ sequence: newIndex, updatedAt: new Date() })
          .where(eq(beats.id, beatId))
        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.BEAT_REORDERED, beatId, newIndex },
        })
      }

      case ActionType.CREATE_CHARACTER: {
        if (!projectId) return NextResponse.json({ error: ApiErrorMessage.PROJECT_ID_REQUIRED }, { status: HttpStatus.BAD_REQUEST })

        const newCharacter = {
          id: uuidv4(),
          projectId,
          name: action.payload.name,
          role: action.payload.role || CharacterRole.SupportingLower,
          description: action.payload.description || '',
          archetype: action.payload.archetype || '',
          psychology: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await db.insert(characters).values(newCharacter)

        // Register as entity with name-based ID for entity linking
        try {
          const { entityRegistry } = await import('@/domains/storyteller/server')
          const slugName = action.payload.name.toLowerCase().replace(/\s+/g, '-')
          await entityRegistry.registerWithId(`char-${slugName}`, {
            name: action.payload.name,
            description: action.payload.description || action.payload.role || action.payload.name,
            metadata: {
              role: action.payload.role,
              archetype: action.payload.archetype,
              motivation: action.payload.motivation,
              fatalFlaw: action.payload.fatalFlaw,
            },
            projectId,
            sourceEntityId: newCharacter.id,
          })
          console.log(`✅ [Actions] Registered entity for character: char-${slugName}`)
        } catch (entityErr) {
          console.warn(API_LOG_PREFIX.ACTIONS_ENTITY_REGISTER_FAILED, entityErr)
        }

        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.CHARACTER_CREATED, character: newCharacter },
        })
      }

      case ActionType.UPDATE_CHARACTER_PROFILE: {
        const { characterId, updates } = action.payload
        await db
          .update(characters)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(characters.id, characterId))
        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.CHARACTER_UPDATED, characterId },
        })
      }

      case ActionType.UPDATE_SCRIPT:
      case ActionType.UPDATE_SCRIPT_CONTENT: {
        const content = action.payload.content
        const append = action.payload.append

        if (episodeId) {
          const [episode] = await db
            .select()
            .from(episodes)
            .where(eq(episodes.id, episodeId))
            .limit(1)
          const currentScript = episode?.scriptContent || ''
          const newScript = append ? currentScript + StringSeparator.DoubleNewline + content : content
          await db
            .update(episodes)
            .set({ scriptContent: newScript, updatedAt: new Date() })
            .where(eq(episodes.id, episodeId))
          return NextResponse.json({
            success: true,
            result: { type: ActionApiResultType.SCRIPT_UPDATED, script: newScript },
          })
        }

        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)
        const currentBible = recordFromJson(project?.seriesBible)
        const currentScript = typeof currentBible.script === 'string' ? currentBible.script : ''
        const newScript = append ? currentScript + StringSeparator.DoubleNewline + content : content
        const updatedBible = await updateSeriesBible({ script: newScript })
        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.SCRIPT_UPDATED, seriesBible: updatedBible },
        })
      }

      default:
        console.log(`⚠️ Unhandled action type: ${action.type}`)
        // Flush Langfuse before returning
        await flushObservability().catch(() => { })
        return NextResponse.json({
          success: true,
          result: { type: ActionApiResultType.ACKNOWLEDGED, message: `Action ${action.type} acknowledged` },
        })
    }
  } catch (error) {
    console.error(API_LOG_PREFIX.ACTIONS_API_ERROR, error)
    // Flush any recorded data before error response
    await flushObservability().catch(() => { })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.ACTION_EXECUTION_FAILED },
      { status: HttpStatus.INTERNAL }
    )
  }
}
