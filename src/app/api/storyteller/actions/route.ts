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
import { requireAuth } from '@/lib/auth'
import { verifyProjectAccess, verifyEpisodeAccess } from '@/domains/storyteller/lib/access-verification'

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
      continue
    }

    if (Array.isArray(sourceValue)) {
      result[key] = sourceValue
    } else if (
      typeof sourceValue === 'object' &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(targetValue, sourceValue)
    } else {
      result[key] = sourceValue
    }
  }

  return result
}

export async function POST(req: NextRequest) {
  try {
    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const { action, projectId, episodeId } = body

    if (!action || !action.type) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Verify access
    if (projectId && !(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }
    if (episodeId && !(await verifyEpisodeAccess(episodeId, session.user.id))) {
      return NextResponse.json({ error: 'Episode not found or access denied' }, { status: 404 })
    }

    console.log(`📥 Actions API: ${action.type} for project ${projectId}`)

    async function updateSeriesBible(updates: Record<string, any>) {
      if (!projectId) throw new Error('Project ID required')

      const [existing] = await db
        .select()
        .from(seriesBibles)
        .where(eq(seriesBibles.projectId, projectId))
        .limit(1)

      const currentContent = (existing?.content as Record<string, any>) || {}
      const updatedContent = deepMerge(currentContent, updates)

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
        .values({ projectId, content: updatedContent, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: updatedContent, updatedAt: new Date() },
        })

      return updatedContent
    }

    switch (action.type) {
      case 'UPDATE_SERIES_BIBLE': {
        const payload = { ...action.payload }

        if (payload.storyPlan) {
          const { storyPlan, ...bibleUpdates } = payload
          await updateSeriesBible(bibleUpdates)
          const updatedPlan = await updateStoryPlan(storyPlan)
          return NextResponse.json({
            success: true,
            result: { type: 'bible_updated', seriesBible: { ...bibleUpdates, storyPlan: updatedPlan } },
          })
        }

        const updatedBible = await updateSeriesBible(payload)
        return NextResponse.json({
          success: true,
          result: { type: 'bible_updated', seriesBible: updatedBible },
        })
      }

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
      case 'SET_GENRE_AND_TONE': {
        // Legacy
        // Map legacy/specific payloads to generic partial update
        let updates: any = {}
        if (action.type === 'UPDATE_WORLD_RULES') updates = { worldRules: action.payload.rules }
        else if (action.type === 'UPDATE_FACTIONS') updates = { factions: action.payload.factions }
        else if (action.type === 'UPDATE_INSPIRATIONS') updates = { inspirations: action.payload.inspirations }
        else if (action.type === 'UPDATE_WORLD_DESCRIPTION') updates = { worldDescription: action.payload.description }
        else if (action.type === 'UPDATE_PLOT_TWISTS') updates = { plotTwists: action.payload.plotTwists }
        else if (action.type === 'UPDATE_KEY_CHARACTERS') updates = { keyCharacters: action.payload.keyCharacters }
        else if (action.type === 'ADD_WORLD_RULE') {
          const [proj] = await db.select().from(seriesBibles).where(eq(seriesBibles.projectId, projectId)).limit(1)
          const curr = (proj?.content as any) || {}
          updates = { worldRules: [...(curr.worldRules || []), action.payload.rule] }
        } else if (action.type === 'SET_GENRE_AND_TONE') {
          updates = { genre: action.payload.genre, tone: action.payload.tone, styleReference: action.payload.styleReference }
        } else if (action.type === 'UPDATE_SOUNDTRACKS') updates = { soundtracks: action.payload.soundtracks }

        const updated = await updateSeriesBible(updates)
        return NextResponse.json({ success: true, result: { type: 'bible_updated', seriesBible: updated } })
      }

      case 'UPDATE_EPISODE_ROADMAP': {
        const payload = action.payload
        const updates: any = {}
        if (payload.sequences) updates.sequences = payload.sequences
        if (payload.seasonStructure) updates.seasonStructure = payload.seasonStructure
        if (payload.executiveSummary) updates.executiveSummary = payload.executiveSummary
        const updatedPlan = await updateStoryPlan(updates)
        return NextResponse.json({ success: true, result: { type: 'bible_updated', seriesBible: { storyPlan: updatedPlan } } })
      }

      case 'UPDATE_ROADMAP_SUMMARY': {
        const updatedPlan = await updateStoryPlan({ executiveSummary: action.payload.executiveSummary })
        return NextResponse.json({ success: true, result: { type: 'bible_updated', seriesBible: { storyPlan: updatedPlan } } })
      }

      case 'UPDATE_EPISODE_PREMISE': {
        const { premise } = action.payload
        if (!episodeId) return NextResponse.json({ error: 'Episode ID required' }, { status: 400 })

        const [existing] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
        const existingPlan = (existing?.storyPlan as Record<string, any>) || {}
        const newPlan = { ...existingPlan, premise: { ...((existingPlan.premise as any) || {}), ...premise } }

        await db.update(episodes).set({ storyPlan: newPlan, updatedAt: new Date() }).where(eq(episodes.id, episodeId))
        return NextResponse.json({ success: true, result: { type: 'episode_updated', storyPlan: newPlan } })
      }

      case 'CREATE_BEAT': {
        if (!episodeId) return NextResponse.json({ error: 'Episode ID required' }, { status: 400 })
        const existingBeats = await db.select().from(beats).where(eq(beats.episodeId, episodeId))

        const newBeat = {
          id: uuidv4(),
          episodeId,
          sequence: existingBeats.length + 1,
          logline: action.payload.logline || '',
          content: action.payload.content || action.payload.description || '',
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
        return NextResponse.json({ success: true, result: { type: 'beat_created', beat: newBeat } })
      }

      case 'UPDATE_BEAT':
      case 'UPDATE_BEAT_CONTENT': {
        const beatId = action.payload.beatId
        if (!beatId) return NextResponse.json({ error: 'Beat ID required' }, { status: 400 })
        const { beatId: _, ...updateData } = action.payload.updates || action.payload
        await db.update(beats).set({ ...updateData, updatedAt: new Date() }).where(eq(beats.id, beatId))
        return NextResponse.json({ success: true, result: { type: 'beat_updated', beatId } })
      }

      case 'DELETE_BEAT': {
        const { beatId } = action.payload
        if (!beatId) return NextResponse.json({ error: 'Beat ID required' }, { status: 400 })
        await db.delete(beats).where(eq(beats.id, beatId))
        return NextResponse.json({ success: true, result: { type: 'beat_deleted', beatId } })
      }

      case 'REORDER_BEAT': {
        const { beatId, newIndex } = action.payload
        await db.update(beats).set({ sequence: newIndex, updatedAt: new Date() }).where(eq(beats.id, beatId))
        return NextResponse.json({ success: true, result: { type: 'beat_reordered', beatId, newIndex } })
      }

      case 'CREATE_CHARACTER': {
        if (!projectId) return NextResponse.json({ error: 'Project ID required' }, { status: 400 })

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
        return NextResponse.json({ success: true, result: { type: 'character_created', character: newCharacter } })
      }

      case 'UPDATE_CHARACTER_PROFILE': {
        const { characterId, updates } = action.payload
        await db.update(characters).set({ ...updates, updatedAt: new Date() }).where(eq(characters.id, characterId))
        return NextResponse.json({ success: true, result: { type: 'character_updated', characterId } })
      }

      case 'UPDATE_SCRIPT':
      case 'UPDATE_SCRIPT_CONTENT': {
        const content = action.payload.content
        const append = action.payload.append

        if (episodeId) {
          const [episode] = await db.select().from(episodes).where(eq(episodes.id, episodeId)).limit(1)
          const currentScript = episode?.scriptContent || ''
          const newScript = append ? currentScript + '\n\n' + content : content
          await db.update(episodes).set({ scriptContent: newScript, updatedAt: new Date() }).where(eq(episodes.id, episodeId))
          return NextResponse.json({ success: true, result: { type: 'script_updated', script: newScript } })
        }

        const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1)
        const currentBible = (project?.seriesBible as Record<string, any>) || {}
        const newScript = append ? (currentBible.script || '') + '\n\n' + content : content
        const updatedBible = await updateSeriesBible({ script: newScript })
        return NextResponse.json({ success: true, result: { type: 'script_updated', seriesBible: updatedBible } })
      }

      default:
        console.log(`⚠️ Unhandled action type: ${action.type}`)
        return NextResponse.json({ success: true, result: { type: 'acknowledged', message: `Action ${action.type} acknowledged` } })
    }
  } catch (error) {
    console.error('Actions API error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Action execution failed' }, { status: 500 })
  }
}
