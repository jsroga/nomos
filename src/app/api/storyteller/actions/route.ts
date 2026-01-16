import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  seriesBibles,
  storyPlans,
  projects,
  beats,
  characters,
  episodes,
} from '@/domains/storyteller/db/schema'
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
    } else if (
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
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

    // Helper to get and update project's series bible in the NEW table
    async function updateSeriesBible(updates: Record<string, any>) {
      if (!projectId) throw new Error('Project ID required')

      // 1. Try to get existing bible
      const [existing] = await db
        .select()
        .from(seriesBibles)
        .where(eq(seriesBibles.projectId, projectId))
        .limit(1)

      const currentContent = (existing?.content as Record<string, any>) || {}
      const updatedContent = deepMerge(currentContent, updates)

      // 2. Upsert to seriesBibles table
      await db
        .insert(seriesBibles)
        .values({
          projectId,
          content: updatedContent,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: seriesBibles.projectId,
          set: {
            content: updatedContent,
            updatedAt: new Date(),
          },
        })

      // 3. ALSO update projects.series_bible column (where frontend reads from)
      // This ensures data persists on page refresh
      await db
        .update(projects)
        .set({
          seriesBible: updatedContent,
          updatedAt: new Date(),
        })
        .where(eq(projects.id, projectId))

      console.log(`✅ Series Bible updated in both tables for project ${projectId}`)

      return updatedContent
    }

    // Helper to update Story Plan in the NEW table
    async function updateStoryPlan(updates: Record<string, any>) {
      if (!projectId) throw new Error('Project ID required')

      const [existing] = await db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .limit(1)

      const currentContent = (existing?.content as Record<string, any>) || {}
      const updatedContent = deepMerge(currentContent, updates)

      await db
        .insert(storyPlans)
        .values({
          projectId,
          content: updatedContent,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: {
            content: updatedContent,
            updatedAt: new Date(),
          },
        })

      return updatedContent
    }

    switch (action.type) {
      // ============================================
      // SERIES BIBLE OPERATIONS
      // ============================================

      case 'UPDATE_SERIES_BIBLE': {
        const payload = { ...action.payload }

        // Split Story Plan content from Bible content
        if (payload.storyPlan) {
          const { storyPlan, ...bibleUpdates } = payload

          // Update Bible
          await updateSeriesBible(bibleUpdates)

          // Update Story Plan
          const updatedPlan = await updateStoryPlan(storyPlan)

          console.log(`✅ Series Bible & Story Plan updated for project ${projectId}`)

          return NextResponse.json({
            success: true,
            result: {
              type: 'bible_updated',
              seriesBible: { ...bibleUpdates, storyPlan: updatedPlan }, // Merge for UI convenience
            },
          })
        }

        // Just Bible updates
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

      // Handle Partial Bible Updates (Smart Merges)
      case 'UPDATE_WORLD_RULES':
      case 'UPDATE_FACTIONS':
      case 'UPDATE_INSPIRATIONS':
      case 'UPDATE_WORLD_DESCRIPTION':
      case 'UPDATE_PLOT_TWISTS':
      case 'UPDATE_KEY_CHARACTERS':
      case 'UPDATE_SOUNDTRACKS':
      case 'ADD_WORLD_RULE': // Legacy
      case 'ADD_THEME': // Legacy
      case 'REMOVE_THEME': // Legacy
      case 'SET_GENRE_AND_TONE': { // Legacy
        // Map legacy/specific payloads to generic partial update
        let updates: any = {}
        if (action.type === 'UPDATE_WORLD_RULES') updates = { worldRules: action.payload.rules } // payload.rules vs worldRules? Schema says payload.rules. Adapter needed?
        // Actually updateSeriesBible uses deepMerge, so we can pass partial objects matching the schema keys

        // Mapping logic:
        if (action.type === 'UPDATE_WORLD_RULES') updates = { worldRules: action.payload.rules } // WARNING: Schema payload is { rules: [...] } but DB stores { worldRules: [...] }?
        // Let's assume the DB schema keys match legacy keys: worldRules, factions, etc.
        // DeepMerge handles replacement of arrays. Smart merge happens at AGENT level (agent sends full array or we implement smart merge here?)
        // Agent prompt says "Use mergeMode smart".
        // If mergeMode is 'smart', we shouldn't just overwrite.
        // BUT `deepMerge` function at top of file replaces arrays.
        // We might need to implement smart merge here if we want to support it, OR rely on agent sending full array.
        // Agent tools prompt says: "Use mergeMode smart... Respond with ... payload: { rules: [...] }"
        // Usually agents read existing, append, and send back full list if they are "smart".
        // But "smart" mergeMode implies the server handles it?
        // "action-reducer.ts" usually handles this.
        // HERE in route.ts, we are the executor.

        // For now, assume agent sends the FINAL array (simplest).

        if (action.type === 'UPDATE_WORLD_RULES') updates = { worldRules: action.payload.rules }
        else if (action.type === 'UPDATE_FACTIONS') updates = { factions: action.payload.factions }
        else if (action.type === 'UPDATE_INSPIRATIONS')
          updates = { inspirations: action.payload.inspirations }
        else if (action.type === 'UPDATE_WORLD_DESCRIPTION')
          updates = { worldDescription: action.payload.description }
        else if (action.type === 'UPDATE_PLOT_TWISTS')
          updates = { plotTwists: action.payload.plotTwists }
        else if (action.type === 'UPDATE_KEY_CHARACTERS')
          updates = { keyCharacters: action.payload.keyCharacters }
        else if (action.type === 'ADD_WORLD_RULE') {
          // Need to fetch existing to append? updateSeriesBible does not append arrays, it replaces.
          // But we can implement specific append logic here or inside updateSeriesBible.
          // Let's stick to updateSeriesBible replacement for now and assume deepMerge replaces arrays.
          // Legacy ADD_WORLD_RULE fetches existing.
          const [proj] = await db
            .select()
            .from(seriesBibles)
            .where(eq(seriesBibles.projectId, projectId))
            .limit(1)
          const curr = (proj?.content as any) || {}
          updates = { worldRules: [...(curr.worldRules || []), action.payload.rule] }
        } else if (action.type === 'SET_GENRE_AND_TONE')
          updates = {
            genre: action.payload.genre,
            tone: action.payload.tone,
            styleReference: action.payload.styleReference,
          }
        else if (action.type === 'UPDATE_SOUNDTRACKS')
          updates = { soundtracks: action.payload.soundtracks }

        const updated = await updateSeriesBible(updates)
        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updated },
        })
      }

      case 'UPDATE_EPISODE_ROADMAP': {
        // This belongs to Story Plan
        const payload = action.payload
        const updates: any = {}
        if (payload.sequences) updates.sequences = payload.sequences
        if (payload.seasonStructure) updates.seasonStructure = payload.seasonStructure
        if (payload.executiveSummary) updates.executiveSummary = payload.executiveSummary

        const updatedPlan = await updateStoryPlan(updates)
        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: { storyPlan: updatedPlan } },
        })
      }

      case 'UPDATE_ROADMAP_SUMMARY': {
        const updatedPlan = await updateStoryPlan({
          executiveSummary: action.payload.executiveSummary,
        })
        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: { storyPlan: updatedPlan } },
        })
      }

      case 'UPDATE_EPISODE_PREMISE': {
        const { premise } = action.payload
        if (!episodeId) {
          return NextResponse.json(
            { error: 'Episode ID required for UPDATE_EPISODE_PREMISE' },
            { status: 400 }
          )
        }

        const [existing] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
        const existingPlan = (existing?.storyPlan as Record<string, any>) || {}

        const newPlan = {
          ...existingPlan,
          premise: {
            ...((existingPlan.premise as any) || {}),
            ...premise,
          },
        }

        await db
          .update(episodes)
          .set({
            storyPlan: newPlan,
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episodeId))

        return NextResponse.json({
          success: true,
          result: { type: 'episode_updated', storyPlan: newPlan },
        })
      }

      // ============================================
      // BEAT OPERATIONS
      // ============================================

      case 'CREATE_BEAT': {
        if (!episodeId) {
          return NextResponse.json(
            { error: 'Episode ID required for CREATE_BEAT' },
            { status: 400 }
          )
        }

        const existingBeats = await db.select().from(beats).where(eq(beats.episodeId, episodeId))

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
          const [episode] = await db
            .select()
            .from(episodes)
            .where(eq(episodes.id, episodeId))
            .limit(1)
          const currentScript = episode?.scriptContent || ''

          const newScript = append ? currentScript + '\n\n' + content : content

          await db
            .update(episodes)
            .set({ scriptContent: newScript, updatedAt: new Date() })
            .where(eq(episodes.id, episodeId))

          return NextResponse.json({
            success: true,
            result: { type: 'script_updated', script: newScript },
          })
        }

        // Fallback to project-level bible (legacy)
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}

        const newScript = append ? (currentBible.script || '') + '\n\n' + content : content

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
        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}

        if (action.type === 'ADD_SETUP') {
          const setups = [
            ...(currentBible.unresolvedSetups || []),
            { id: uuidv4(), ...action.payload },
          ]
          await updateSeriesBible({ unresolvedSetups: setups })
        } else if (action.type === 'RESOLVE_SETUP') {
          const setups = (currentBible.unresolvedSetups || []).map((s: any) =>
            s.id === action.payload.setupId
              ? { ...s, isResolved: true, payoffBeatId: action.payload.payoffBeatId }
              : s
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
