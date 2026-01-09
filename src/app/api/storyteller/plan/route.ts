import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { episodes, projects, storyPlans } from '@/domains/storyteller/db/schema'
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
          storyPlan: episodes.storyPlan,
          planApproved: episodes.planApproved,
          currentPhase: episodes.currentPhase,
          posterUrl: episodes.posterUrl,
          posterPrompt: episodes.posterPrompt,
          scriptContent: episodes.scriptContent,
          title: episodes.title,
        })
        .from(episodes)
        .where(eq(episodes.id, episodeId))
        .limit(1)

      if (!episode) {
        return NextResponse.json({ error: 'Episode not found' }, { status: 404 })
      }

      return NextResponse.json({
        storyPlan: {
          ...(episode.storyPlan as any || {}),
          title: episode.title, // Ensure DB title is authoritative
          posterUrl: episode.posterUrl || (episode.storyPlan as any)?.posterUrl || (episode.storyPlan as any)?.poster_url,
          posterPrompt: episode.posterPrompt || (episode.storyPlan as any)?.posterPrompt || (episode.storyPlan as any)?.poster_prompt,
          storyboardUrl: (episode.storyPlan as any)?.storyboardUrl || (episode.storyPlan as any)?.storyboard_url,
          projectId: projectId,
        },
        planApproved: episode.planApproved,
        currentPhase: episode.currentPhase || 'premise',
        script: episode.scriptContent || '',
      })
    } else if (projectId) {
      // Fetch project-level plan from NEW table
      const [plan] = await db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .limit(1)

      if (!plan) {
        // Fallback to old table during migration (optional, but robust)
        const [project] = await db
          .select({ storyPlan: projects.storyPlan })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)

        if (project?.storyPlan) {
          return NextResponse.json({ storyPlan: project.storyPlan })
        }

        return NextResponse.json({ storyPlan: null })
      }

      return NextResponse.json({
        storyPlan: plan.content,
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
      // Save to project (series-level) - NEW table
      await db.insert(storyPlans)
        .values({
          projectId: projectId,
          content: storyPlan,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: storyPlan, updatedAt: new Date() }
        })

      return NextResponse.json({
        success: true
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
      // Fetch from new storyPlans table
      const [plan] = await db
        .select()
        .from(storyPlans)
        .where(eq(storyPlans.projectId, projectId))
        .limit(1)

      existingPlan = plan?.content

      // Fallback
      if (!existingPlan) {
        const [project] = await db
          .select({ storyPlan: projects.storyPlan })
          .from(projects)
          .where(eq(projects.id, projectId))
          .limit(1)
        existingPlan = project?.storyPlan
      }
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
      await db.insert(storyPlans)
        .values({
          projectId: projectId,
          content: updatedPlan,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: storyPlans.projectId,
          set: { content: updatedPlan, updatedAt: new Date() }
        })
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
