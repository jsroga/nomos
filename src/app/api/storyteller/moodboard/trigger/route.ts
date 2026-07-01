import { NextRequest, NextResponse } from 'next/server'
import { tasks } from '@trigger.dev/sdk/v3'
import { db } from '@/lib/db'
import { projects, type StoryPlan, verifyProjectAccess } from '@/domains/storyteller'
import { eq } from 'drizzle-orm'
import OpenAI from 'openai'
import { requireAuth } from '@/lib/auth'
import { resolveStyleReferenceUrls } from '@/config/style-presets'

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

export async function POST(req: NextRequest) {
  try {
    const openai = getOpenAIClient()
    if (!openai) {
      return NextResponse.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 500 })
    }

    const { session } = await requireAuth()
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { projectId, providerConfig, styleReference, promptIndex } = await req.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 })
    }

    // Verify project access
    if (!(await verifyProjectAccess(projectId, session.user.id))) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 })
    }

    // Fetch Project Bible Data and Settings
    const project = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get style references from project settings (preset or custom URLs)
    const styleReferenceUrls = resolveStyleReferenceUrls(project)
    if (styleReference) {
      styleReferenceUrls.push(styleReference)
    }

    // Get bible data
    const bible = (project.seriesBible || {}) as Partial<StoryPlan>
    const projectTitle = bible.title || project.name || 'Untitled Project'
    const genre = bible.genre || 'Unknown genre'
    const tone = bible.tone || 'atmospheric'
    const worldDesc = bible.worldDescription || project.description || projectTitle

    // Define Prompt Types
    const promptTypes = [
      'Wide establishing shot of the main environment, focusing on scale and atmosphere.',
      'Street level or interior view showing daily life and culture.',
      'Portrait of a typical inhabitant or faction member, highlighting attire and traits.',
    ]

    let prompts: string[] = []

    try {
      let systemPrompt = `You are a creative director for a film or game project. Generate 3 distinct, highly visual image generation prompts for an AI art generator (like Midjourney or Imagen).
Project: ${projectTitle}
Genre: ${genre}
Tone: ${tone}
World Description: ${worldDesc}

The prompts should correspond to these categories:
1. Environment/Landscape
2. Daily Life/Scene
3. Character Portrait

Output ONLY the 3 prompts as a JSON array of strings. Do not include markdown formatting or numbering.`

      if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < 3) {
        systemPrompt = `You are a creative director. Generate ONE highly visual image generation prompt for:
Project: ${projectTitle}
Genre: ${genre}
Tone: ${tone}
World Description: ${worldDesc}

The prompt must be for the category: "${promptTypes[promptIndex]}"

Output ONLY the single prompt string.`
      }

      const gptResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.7,
      })

      const content = gptResponse.choices[0]?.message?.content?.trim() || ''

      if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < 3) {
        prompts = [content.replace(/^"|"$/g, '')]
      } else {
        try {
          const cleanContent = content
            .replace(/```json/g, '')
            .replace(/```/g, '')
            .trim()
          prompts = JSON.parse(cleanContent)
        } catch (e) {
          console.warn(
            'Failed to parse GPT prompts as JSON, falling back to manual construction',
            e
          )
          prompts = [
            `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Wide environment shot.`,
            `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Daily life scene.`,
            `Movie concept art, ${projectTitle}, ${genre}, ${tone}. ${worldDesc}. Character portrait.`,
          ]
        }
      }
    } catch (openaiError) {
      console.error('OpenAI Prompt Generation failed:', openaiError)
      const baseContext = `Project: ${projectTitle}. Genre: ${genre}. Tone: ${tone}. World: ${worldDesc}.`
      const allPrompts = [
        `${baseContext} Wide establishing shot of the main environment. Grand scale.`,
        `${baseContext} Street level view of daily life in this world. Atmospheric.`,
        `${baseContext} Portrait of a typical inhabitant or faction member. Character study.`,
      ]

      if (typeof promptIndex === 'number' && promptIndex >= 0 && promptIndex < allPrompts.length) {
        prompts = [allPrompts[promptIndex]]
      } else {
        prompts = allPrompts
      }
    }

    // Use env LEGNEXT_API_KEY when client didn't send one (e.g. key configured only on server)
    const resolvedProviderConfig = {
      ...providerConfig,
      styleReferenceUrls,
    }
    if (
      resolvedProviderConfig.provider === 'midjourney' &&
      !resolvedProviderConfig.apiKey &&
      process.env.LEGNEXT_API_KEY
    ) {
      resolvedProviderConfig.apiKey = process.env.LEGNEXT_API_KEY
    }

    const handle = await tasks.trigger('generate-moodboard', {
      projectId,
      prompts,
      styleReference: undefined,
      replaceIndex: typeof promptIndex === 'number' ? promptIndex : undefined,
      providerConfig: resolvedProviderConfig,
    })

    return NextResponse.json({
      success: true,
      handleId: handle.id,
    })
  } catch (error) {
    console.error('Failed to trigger moodboard generation:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
