import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { episodes, projects } from '@/domains/storyteller/db/schema'
import { eq } from 'drizzle-orm'

// GET: Fetch story plan for an episode or project
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const episodeId = searchParams.get('episodeId')
  const projectId = searchParams.get('projectId')

  try {
    if (episodeId) {
      // Fetch episode-level plan
      const [episode] = await db
        .select({
        .select({
          storyPlan: episodes.storyPlan,
          planApproved: episodes.planApproved,
          currentPhase: episodes.currentPhase,
          posterUrl: episodes.posterUrl,
          posterPrompt: episodes.posterPrompt,
        })
            .from(episodes)
            .where(eq(episodes.id, episodeId))
            .limit(1)

      if(!episode) {
            return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
          }

      return NextResponse.json({
            storyPlan: {
              ...(episode.storyPlan as any || {}),
              posterUrl: episode.posterUrl,
              posterPrompt: episode.posterPrompt,
              projectId: projectId, // Inject project ID if available in context or query, but wait, projectId var comes from query param which might be null if fetching by episodeId?
              // Actually, I can join projects to get projectId if needed, or trust the client passed it?
              // Client passes projectId in query sometimes.
              // But safer to just attach poster data.
            },
            planApproved: episode.planApproved,
            currentPhase: episode.currentPhase || 'premise',
          })
        } else if (projectId) {
          // Fetch project-level plan
          const [project] = await db
            .select({
              storyPlan: projects.storyPlan,
            })
            .from(projects)
            .where(eq(projects.id, projectId))
            .limit(1)

          if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 })
          }

          return NextResponse.json({
            storyPlan: project.storyPlan,
          })
        } else {
        return NextResponse.json({ error: 'Episode ID or Project ID is required' }, { status: 400 })
      }
    } catch (error) {
      console.error('Error fetching story plan:', error)
      return NextResponse.json({ error: 'Failed to fetch story plan' }, { status: 500 })
    }
  }

// POST: Save/update story plan
export async function POST(req: NextRequest) {
    try {
      const body = await req.json()
      const { episodeId, projectId, storyPlan, approved, currentPhase } = body

      if (episodeId) {
        // Build update object
        const updateData: any = {
          updatedAt: new Date(),
        }

        if (storyPlan !== undefined) {
          updateData.storyPlan = storyPlan
        }
        if (approved !== undefined) {
          updateData.planApproved = approved
        }
        if (currentPhase !== undefined) {
          updateData.currentPhase = currentPhase
        }

        // Save to episode
        const [updated] = await db
          .update(episodes)
          .set(updateData)
          .where(eq(episodes.id, episodeId))
          .returning()

        return NextResponse.json({
          success: true,
          episode: updated,
        })
      } else if (projectId) {
        // Save to project (series-level)
        const [updated] = await db
          .update(projects)
          .set({
            storyPlan,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId))
          .returning()

        return NextResponse.json({
          success: true,
          project: updated,
        })
      } else {
        return NextResponse.json({ error: 'Episode ID or Project ID is required' }, { status: 400 })
      }
    } catch (error) {
      console.error('Error saving story plan:', error)
      return NextResponse.json({ error: 'Failed to save story plan' }, { status: 500 })
    }
  }

  // PATCH: Update individual sequence in story plan
  export async function PATCH(req: NextRequest) {
    try {
      const body = await req.json()
      const { episodeId, projectId, sequenceId, updates } = body

      if (!sequenceId || !updates) {
        return NextResponse.json({ error: 'Sequence ID and updates are required' }, { status: 400 })
      }

      // Get existing plan
      let existingPlan: any = null

      if (episodeId) {
        const [episode] = await db
          .select({ storyPlan: episodes.storyPlan })
          .from(episodes)
          .where(eq(episodes.id, episodeId))
          .limit(1)
        existingPlan = episode?.storyPlan
      } else if (projectId) {
        const [project] = await db
          .select({ storyPlan: projects.storyPlan })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)
        existingPlan = project?.storyPlan
      }

      if (!existingPlan || !existingPlan.sequences) {
        return NextResponse.json({ error: 'No existing plan found' }, { status: 404 })
      }

      // Update the specific sequence
      const updatedSequences = existingPlan.sequences.map((seq: any) =>
        seq.id === sequenceId ? { ...seq, ...updates } : seq
      )

      const updatedPlan = {
        ...existingPlan,
        sequences: updatedSequences,
      }

      // Save updated plan
      if (episodeId) {
        await db
          .update(episodes)
          .set({
            storyPlan: updatedPlan,
            updatedAt: new Date(),
          })
          .where(eq(episodes.id, episodeId))
      } else if (projectId) {
        await db
          .update(projects)
          .set({
            storyPlan: updatedPlan,
            updatedAt: new Date(),
          })
          .where(eq(projects.id, projectId))
      }

      return NextResponse.json({
        success: true,
        storyPlan: updatedPlan,
      })
    } catch (error) {
      console.error('Error updating sequence:', error)
      return NextResponse.json({ error: 'Failed to update sequence' }, { status: 500 })
    }
  }
