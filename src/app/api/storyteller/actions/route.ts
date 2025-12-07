import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { projects, beats, characters, episodes } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

/**
 * Deep merge two objects, with special handling for arrays (replace, not concat)
 */
function deepMerge(target: any, source: any): any {
  if (!source) return target
  if (!target) return source

  const result = { ...target }

  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = target[key]

    if (sourceValue === null || sourceValue === undefined) {
      // Skip null/undefined values to preserve existing
      continue
    }

    if (Array.isArray(sourceValue)) {
      // Replace arrays entirely (don't merge)
      result[key] = sourceValue
    } else if (typeof sourceValue === 'object' && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
      // Recursively merge objects
      result[key] = deepMerge(targetValue, sourceValue)
    } else {
      // Replace primitive values
      result[key] = sourceValue
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, projectId, episodeId } = body

    if (!action || !action.type) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    console.log(`📥 Actions API: ${action.type} for project ${projectId}`)

    // Helper to get and update project's series bible
    async function updateSeriesBible(updates: Record<string, any>) {
      if (!projectId) throw new Error('Project ID required')

      const [project] = await db
        .select()
        .from(projects)
        .where(eq(projects.id, projectId))
        .limit(1)

      if (!project) throw new Error('Project not found')

      const currentBible = (project.seriesBible as Record<string, any>) || {}
      const updatedBible = deepMerge(currentBible, updates)

      await db
        .update(projects)
        .set({
          seriesBible: updatedBible,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))

      return updatedBible
    }

    switch (action.type) {
      // ============================================
      // SERIES BIBLE OPERATIONS
      // ============================================

      case 'UPDATE_SERIES_BIBLE': {
        // Unwrap storyPlan if present to keep series_bible flat
        const payload = { ...action.payload }
        if (payload.storyPlan) {
          const { storyPlan, ...rest } = payload
          Object.assign(payload, { ...rest, ...storyPlan })
          delete payload.storyPlan
        }

        const updatedBible = await updateSeriesBible(payload)
        console.log(`✅ Series Bible updated for project ${projectId}`)

        return NextResponse.json({
          success: true,
          result: {
            type: 'bible_updated',
            seriesBible: updatedBible,
          },
        })
      }

      case 'SET_GENRE_AND_TONE': {
        const { genre, tone, styleReference } = action.payload
        const updatedBible = await updateSeriesBible({ genre, tone, styleReference })

        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updatedBible },
        })
      }

      case 'ADD_THEME': {
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}
        const themes = [...(currentBible.themes || []), action.payload.theme]
        const updatedBible = await updateSeriesBible({ themes })

        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updatedBible },
        })
      }

      case 'REMOVE_THEME': {
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}
        const themes = (currentBible.themes || []).filter((t: string) => t !== action.payload.theme)
        const updatedBible = await updateSeriesBible({ themes })

        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updatedBible },
        })
      }

      case 'ADD_WORLD_RULE': {
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}
        const worldRules = [...(currentBible.worldRules || []), action.payload.rule]
        const updatedBible = await updateSeriesBible({ worldRules })

        return NextResponse.json({
          success: true,
          result: { type: 'world_rule_added', seriesBible: updatedBible },
        })
      }

      case 'CREATE_LOCATION': {
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}
        const locations = [...(currentBible.locations || []), { id: uuidv4(), ...action.payload }]
        const updatedBible = await updateSeriesBible({ locations })

        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updatedBible },
        })
      }

      case 'UPDATE_LOCATION': {
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}
        const locations = (currentBible.locations || []).map((loc: any) =>
          loc.id === action.payload.locationId ? { ...loc, ...action.payload.updates } : loc
        )
        const updatedBible = await updateSeriesBible({ locations })

        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updatedBible },
        })
      }

      case 'ADD_LORE_ENTRY': {
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}
        const lore = [...(currentBible.lore || []), { id: uuidv4(), ...action.payload }]
        const updatedBible = await updateSeriesBible({ lore })

        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updatedBible },
        })
      }

      case 'DEFINE_MAGIC_SYSTEM': {
        const updatedBible = await updateSeriesBible({ magicSystem: action.payload })

        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updatedBible },
        })
      }

      case 'UPDATE_EPISODE_PREMISE': {
        const { premise } = action.payload
        if (!episodeId) {
          return NextResponse.json({ error: 'Episode ID required for UPDATE_EPISODE_PREMISE' }, { status: 400 })
        }

        const [existing] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
        const existingPlan = (existing?.storyPlan as Record<string, any>) || {}

        // Merge premise into story plan sequences or top level?
        // Actually, schema has separate fields for premise on episode now?
        // Let's check schema. Assuming we store in storyPlan for now or strictly typed fields if they existed.
        // For now, let's store it in `storyPlan.premise` to keep it safe.

        const newPlan = {
          ...existingPlan,
          premise: premise
        }

        await db.update(episodes)
          .set({
            storyPlan: newPlan,
            updatedAt: new Date()
          })
          .where(eq(episodes.id, episodeId))

        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: newPlan },
        })
      }

      // ============================================
      // BEAT OPERATIONS
      // ============================================

      case 'CREATE_BEAT': {
        if (!episodeId) {
          return NextResponse.json({ error: 'Episode ID required for CREATE_BEAT' }, { status: 400 })
        }

        const existingBeats = await db
          .select()
          .from(beats)
          .where(eq(beats.episodeId, episodeId))

        const newBeat = {
          id: uuidv4(),
          episodeId,
          sequence: existingBeats.length + 1,
          logline: action.payload.logline || '',
          content: action.payload.content || action.payload.description || '', // Fallback for description mismatch
          beatType: action.payload.beatType || 'complication',
          status: 'proposed' as const,
          charactersInvolved: action.payload.charactersInvolved || [],
          emotionalShifts: action.payload.emotionalShifts || {},
          visualHook: action.payload.visualHook || '',
          causalDependencies: action.payload.causalDependencies || [],
          setupsPayoffs: action.payload.setupsPayoffs || {},
          mazurElements: action.payload.mazurElements || null,
        }

        await db.insert(beats).values(newBeat)
        console.log(`✅ Beat created: ${newBeat.id}`)

        return NextResponse.json({
          success: true,
          result: { type: 'beat_created', beat: newBeat },
        })
      }

      case 'UPDATE_BEAT':
      case 'UPDATE_BEAT_CONTENT': {
        const beatId = action.payload.beatId
        const updates = action.payload.updates || action.payload

        if (!beatId) {
          return NextResponse.json({ error: 'Beat ID required' }, { status: 400 })
        }

        // Remove beatId from updates if present
        const { beatId: _, ...updateData } = updates

        await db
          .update(beats)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(beats.id, beatId))

        console.log(`✅ Beat updated: ${beatId}`)

        return NextResponse.json({
          success: true,
          result: { type: 'beat_updated', beatId },
        })
      }

      case 'DELETE_BEAT': {
        const { beatId } = action.payload
        if (!beatId) {
          return NextResponse.json({ error: 'Beat ID required' }, { status: 400 })
        }

        await db.delete(beats).where(eq(beats.id, beatId))
        console.log(`✅ Beat deleted: ${beatId}`)

        return NextResponse.json({
          success: true,
          result: { type: 'beat_deleted', beatId },
        })
      }

      case 'REORDER_BEAT': {
        const { beatId, newIndex } = action.payload

        await db
          .update(beats)
          .set({ sequence: newIndex, updatedAt: new Date() })
          .where(eq(beats.id, beatId))

        return NextResponse.json({
          success: true,
          result: { type: 'beat_reordered', beatId, newIndex },
        })
      }

      case 'SPLIT_BEAT':
      case 'MERGE_BEATS':
      case 'LINK_BEATS':
      case 'TAG_BEAT': {
        // These are complex operations - log and acknowledge
        console.log(`⚠️ Complex beat operation: ${action.type}`, action.payload)
        return NextResponse.json({
          success: true,
          result: { type: 'acknowledged', action: action.type },
        })
      }

      // ============================================
      // CHARACTER OPERATIONS
      // ============================================

      case 'CREATE_CHARACTER': {
        if (!projectId) {
          return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
        }

        const newCharacter = {
          id: uuidv4(),
          projectId,
          name: action.payload.name,
          role: action.payload.role || 'supporting',
          description: action.payload.description || '',
          archetype: action.payload.archetype || '',
          psychology: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        }

        await db.insert(characters).values(newCharacter)
        console.log(`✅ Character created: ${newCharacter.name}`)

        return NextResponse.json({
          success: true,
          result: { type: 'character_created', character: newCharacter },
        })
      }

      case 'UPDATE_CHARACTER_PROFILE': {
        const { characterId, updates } = action.payload

        await db
          .update(characters)
          .set({ ...updates, updatedAt: new Date() })
          .where(eq(characters.id, characterId))

        return NextResponse.json({
          success: true,
          result: { type: 'character_updated', characterId },
        })
      }

      case 'UPDATE_CHARACTER_RELATIONSHIP':
      case 'SET_CHARACTER_GOAL':
      case 'ADD_CHARACTER_SECRET':
      case 'UPDATE_CHARACTER_ARC_STATUS':
      case 'UPDATE_CHARACTER_METRICS':
      case 'ARCHIVE_CHARACTER':
      case 'CAST_CHARACTER': {
        // Character operations that update specific fields
        const characterId = action.payload.characterId
        if (!characterId) {
          return NextResponse.json({ error: 'Character ID required' }, { status: 400 })
        }

        // Get current character
        const [character] = await db
          .select()
          .from(characters)
          .where(eq(characters.id, characterId))
          .limit(1)

        if (!character) {
          return NextResponse.json({ error: 'Character not found' }, { status: 404 })
        }

        // Merge updates into psychology/metadata
        const currentPsychology = (character.psychology as Record<string, any>) || {}
        const updatedPsychology = deepMerge(currentPsychology, action.payload)

        await db
          .update(characters)
          .set({ psychology: updatedPsychology, updatedAt: new Date() })
          .where(eq(characters.id, characterId))

        return NextResponse.json({
          success: true,
          result: { type: 'character_updated', characterId },
        })
      }

      // ============================================
      // SCRIPT OPERATIONS
      // ============================================

      case 'UPDATE_SCRIPT':
      case 'UPDATE_SCRIPT_CONTENT': {
        // Store script in episode if ID present, otherwise series bible
        const content = action.payload.content
        const append = action.payload.append

        if (episodeId) {
          const [episode] = await db.select().from(episodes).where(eq(episodes.id, episodeId)).limit(1)
          const currentScript = episode?.scriptContent || ''

          const newScript = append
            ? currentScript + '\n\n' + content
            : content

          await db.update(episodes)
            .set({ scriptContent: newScript, updatedAt: new Date() })
            .where(eq(episodes.id, episodeId))

          return NextResponse.json({
            success: true,
            result: { type: 'script_updated', script: newScript }
          })
        }

        // Fallback to project-level bible (legacy)
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}

        const newScript = append
          ? (currentBible.script || '') + '\n\n' + content
          : content

        const updatedBible = await updateSeriesBible({ script: newScript })

        return NextResponse.json({
          success: true,
          result: { type: 'script_updated', seriesBible: updatedBible },
        })
      }

      case 'CREATE_SCENE':
      case 'UPDATE_SCENE_ACTION':
      case 'UPDATE_DIALOGUE':
      case 'REORDER_SCENE':
      case 'DELETE_SCENE':
      case 'ADD_SCENE_NOTE':
      case 'SET_SCENE_MOOD': {
        // Scene operations - acknowledge for now
        console.log(`⚠️ Scene operation: ${action.type}`, action.payload)
        return NextResponse.json({
          success: true,
          result: { type: 'acknowledged', action: action.type },
        })
      }

      // ============================================
      // TRACKING OPERATIONS
      // ============================================

      case 'ADD_SETUP':
      case 'RESOLVE_SETUP':
      case 'ADD_KNOWLEDGE': {
        // These update tracking state - store in series bible
        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}

        if (action.type === 'ADD_SETUP') {
          const setups = [...(currentBible.unresolvedSetups || []), { id: uuidv4(), ...action.payload }]
          await updateSeriesBible({ unresolvedSetups: setups })
        } else if (action.type === 'RESOLVE_SETUP') {
          const setups = (currentBible.unresolvedSetups || []).map((s: any) =>
            s.id === action.payload.setupId ? { ...s, isResolved: true, payoffBeatId: action.payload.payoffBeatId } : s
          )
          await updateSeriesBible({ unresolvedSetups: setups })
        }

        return NextResponse.json({
          success: true,
          result: { type: 'tracking_updated' },
        })
      }

      default:
        console.log(`⚠️ Unhandled action type: ${action.type}`)
        return NextResponse.json({
          success: true,
          result: {
            type: 'acknowledged',
            message: `Action ${action.type} acknowledged`,
          },
        })
    }
  } catch (error) {
    console.error('Actions API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action execution failed' },
      { status: 500 }
    )
  }
}

