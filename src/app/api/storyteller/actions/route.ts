import { NextRequest, NextResponse } from 'next/server'
import { beats, characters, episodes, projects, seriesBibles, storyPlans } from '@/db'
import { db } from '@/lib/db'
import { verifyEpisodeAccess, verifyProjectAccess } from '@/shared/auth'
import { eq, and } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'
import { requireAuth } from '@/lib/auth'
import { recordUserAction, flushObservability } from '@/agent-core/observability'

/**
 * Deep merge two objects, with special handling for arrays (replace, not concat)
 */
function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>
): Record<string, unknown> {
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
      sourceValue !== null &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(targetValue) &&
      !Array.isArray(sourceValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>
      )
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

    // Extract trace ID for Langfuse correlation (from headers or body)
    const traceId = req.headers.get('x-trace-id') || body.traceId || `action-${Date.now()}`

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
      if (!projectId) throw new Error('Project ID required')

      const [existing] = await db
        .select()
        .from(seriesBibles)
        .where(eq(seriesBibles.projectId, projectId))
        .limit(1)

      const currentContent = (existing?.content as Record<string, unknown>) || {}
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

    const updateStoryPlan = async (updates: Record<string, unknown>) => {
      if (!projectId) throw new Error('Project ID required')

      const [existing] = await db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .limit(1)

      const currentContent = (existing?.content as Record<string, unknown>) || {}
      console.log('📖 [updateStoryPlan] BEFORE - currentContent keys:', Object.keys(currentContent))
      console.log(
        '📖 [updateStoryPlan] BEFORE - worldDescription:',
        (currentContent.worldDescription as string)?.slice(0, 80)
      )
      console.log('📖 [updateStoryPlan] INCOMING - updates keys:', Object.keys(updates))
      console.log(
        '📖 [updateStoryPlan] INCOMING - worldDescription:',
        (updates.worldDescription as string)?.slice(0, 80)
      )

      const updatedContent = deepMerge(currentContent, updates)

      console.log(
        '📖 [updateStoryPlan] AFTER MERGE - updatedContent keys:',
        Object.keys(updatedContent)
      )
      console.log(
        '📖 [updateStoryPlan] AFTER MERGE - worldDescription:',
        (updatedContent.worldDescription as string)?.slice(0, 80)
      )

      await db
        .insert(storyPlans)
        .values({ projectId, content: updatedContent, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: updatedContent, updatedAt: new Date() },
        })

      console.log('✅ [updateStoryPlan] WRITE COMPLETE - saved to database')

      return updatedContent
    }

    switch (action.type) {
      case 'UPDATE_SERIES_BIBLE': {
        const payload = { ...action.payload }

        // Fields that definitely belong to Story Plan
        const STORY_PLAN_FIELDS = [
          'genre',
          'tone',
          'themes',
          'worldRules',
          'factions',
          'keyCharacters',
          'plotTwists',
          'inspirations',
          'worldDescription',
          'soundtracks',
          'styleReference',
          'sequences',
          'seasonStructure',
          'executiveSummary',
          'moodImages',
          'imagePrompts',
        ]

        const planUpdates: Record<string, unknown> = {}
        const bibleUpdates: Record<string, unknown> = {}

        // 1. Extract nested storyPlan if exists
        if (payload.storyPlan) {
          Object.assign(planUpdates, payload.storyPlan)
          delete payload.storyPlan
        }

        // 2. Separate top-level fields
        for (const key of Object.keys(payload)) {
          if (STORY_PLAN_FIELDS.includes(key)) {
            planUpdates[key] = payload[key]
          } else {
            bibleUpdates[key] = payload[key]
          }
        }

        let updatedBible = {}
        let updatedPlan = {}

        // 3. Execute updates
        console.log('🔍 [API] Detailed Updates:', {
          bibleKeys: Object.keys(bibleUpdates),
          planKeys: Object.keys(planUpdates),
          rawPayload: JSON.stringify(payload).substring(0, 200) + '...',
        })

        if (Object.keys(bibleUpdates).length > 0) {
          console.log('💾 [API] Updating Series Bible Table...')
          updatedBible = await updateSeriesBible(bibleUpdates)
        }

        if (Object.keys(planUpdates).length > 0) {
          console.log('💾 [API] Updating Story Plan Table...')
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
        console.log('✅ [API] Success. Returning:', Object.keys(finalResult))

        return NextResponse.json({
          success: true,
          result: {
            type: 'bible_updated',
            seriesBible: finalResult,
          },
        })
      }

      case 'UPDATE_CAST': {
        console.log('[API] UPDATE_CAST Payload keys:', Object.keys(action.payload || {}))
        if (action.payload.cast && Array.isArray(action.payload.cast))
          console.log('[API] UPDATE_CAST cast length:', action.payload.cast.length)
        if (action.payload.keyCharacters && Array.isArray(action.payload.keyCharacters))
          console.log('[API] UPDATE_CAST keyCharacters length:', action.payload.keyCharacters.length)

        // cast is the project-level list of characters (Story Plan)
        const castData = action.payload.cast || action.payload.keyCharacters || action.payload.characters
        const updates = { cast: castData }
        console.log(`💾 [API] UPDATE_CAST - Saving ${updates.cast?.length} characters`)
        const updated = await updateStoryPlan(updates)

        // SYNC characters to the characters TABLE so CharacterPanel sees them
        if (Array.isArray(castData) && projectId) {
          console.log(`🔄 [API] UPDATE_CAST - Syncing ${castData.length} characters to characters table`)

          // Strip entity link markers [Text][entity-id] → Text
          const stripLinks = (s: any) => typeof s === 'string' ? s.replace(/\[([^\]]+)\]\[[^\]]+\]/g, '$1') : s

          for (const rawChar of castData as Record<string, unknown>[]) {
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
                const buildPsychology = (existingPsych: any = {}) => ({
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
                    psychology: buildPsychology((current.psychology as Record<string, unknown>) || {}),
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
                  role: char.role || 'Supporting',
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
          result: { type: 'bible_updated', seriesBible: { storyPlan: updated }, characters_synced: true },
        })
      }

      case 'UPDATE_WORLD_RULES':
      case 'UPDATE_FACTIONS':
      case 'UPDATE_INSPIRATIONS':
      case 'UPDATE_WORLD_DESCRIPTION':
      case 'UPDATE_PLOT_TWISTS':
      case 'UPDATE_SOUNDTRACKS':
      case 'ADD_WORLD_RULE': // Legacy
      case 'ADD_THEME': // Legacy
      case 'REMOVE_THEME': // Legacy
      case 'SET_GENRE_AND_TONE': {
        // Legacy
        // Map legacy/specific payloads to generic partial update
        // Support both old format (rules) and new format (worldRules)
        let updates: any = {}
        if (action.type === 'UPDATE_WORLD_RULES') {
          updates = { worldRules: action.payload.worldRules || action.payload.rules }
        } else if (action.type === 'UPDATE_FACTIONS') {
          updates = { factions: action.payload.factions }
        } else if (action.type === 'UPDATE_INSPIRATIONS') {
          updates = { inspirations: action.payload.inspirations }
        } else if (action.type === 'UPDATE_WORLD_DESCRIPTION') {
          updates = {
            worldDescription: action.payload.worldDescription || action.payload.description,
          }
        } else if (action.type === 'UPDATE_PLOT_TWISTS') {
          updates = { plotTwists: action.payload.plotTwists }
        } else if (action.type === 'UPDATE_KEY_CHARACTERS') {
          updates = { keyCharacters: action.payload.keyCharacters || action.payload.characters }
        } else if (action.type === 'ADD_WORLD_RULE') {
          const [proj] = await db
            .select()
            .from(storyPlans)
            .where(eq(storyPlans.projectId, projectId))
            .limit(1)
          const curr = (proj?.content as Record<string, unknown>) || {}
          updates = { worldRules: [...((curr.worldRules as any[]) || []), action.payload.rule] }
        } else if (action.type === 'SET_GENRE_AND_TONE') {
          updates = {
            genre: action.payload.genre,
            tone: action.payload.tone,
            styleReference: action.payload.styleReference,
          }
        } else if (action.type === 'UPDATE_SOUNDTRACKS')
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
          result: { type: 'bible_updated', seriesBible: { storyPlan: updated } },
        })
      }

      case 'UPDATE_EPISODE_ROADMAP': {
        const payload = action.payload
        const updates: any = {}
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
        if (!episodeId) return NextResponse.json({ error: 'Episode ID required' }, { status: 400 })

        const [existing] = await db.select().from(episodes).where(eq(episodes.id, episodeId))
        const existingPlan = (existing?.storyPlan as Record<string, unknown>) || {}
        const newPlan = {
          ...existingPlan,
          premise: {
            ...((existingPlan.premise as Record<string, unknown>) || {}),
            ...premise,
          },
        }

        await db
          .update(episodes)
          .set({ storyPlan: newPlan, updatedAt: new Date() })
          .where(eq(episodes.id, episodeId))
        return NextResponse.json({
          success: true,
          result: { type: 'episode_updated', storyPlan: newPlan },
        })
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
        await db
          .update(beats)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(beats.id, beatId))
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
        await db
          .update(beats)
          .set({ sequence: newIndex, updatedAt: new Date() })
          .where(eq(beats.id, beatId))
        return NextResponse.json({
          success: true,
          result: { type: 'beat_reordered', beatId, newIndex },
        })
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

        // Register as entity with name-based ID for entity linking
        try {
          const { entityRegistry } = await import('@/domains/storyteller')
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
          console.warn('[Actions] Entity registration failed (non-blocking):', entityErr)
        }

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

      case 'UPDATE_SCRIPT':
      case 'UPDATE_SCRIPT_CONTENT': {
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

        const [project] = await db
          .select()
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)
        const currentBible = (project?.seriesBible as Record<string, unknown>) || {}
        const newScript = append ? (currentBible.script || '') + '\n\n' + content : content
        const updatedBible = await updateSeriesBible({ script: newScript })
        return NextResponse.json({
          success: true,
          result: { type: 'script_updated', seriesBible: updatedBible },
        })
      }

      default:
        console.log(`⚠️ Unhandled action type: ${action.type}`)
        // Flush Langfuse before returning
        await flushObservability().catch(() => { })
        return NextResponse.json({
          success: true,
          result: { type: 'acknowledged', message: `Action ${action.type} acknowledged` },
        })
    }
  } catch (error) {
    console.error('Actions API error:', error)
    // Flush any recorded data before error response
    await flushObservability().catch(() => { })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Action execution failed' },
      { status: 500 }
    )
  }
}
