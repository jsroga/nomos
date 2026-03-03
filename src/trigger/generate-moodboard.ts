import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { getErrorMessage } from '@/lib/error-utils'
import {
  logLLMRequestStart,
  logLLMRequestComplete,
  logLLMRequestError,
} from './utils/llm-logger'

interface GenerateMoodboardPayload {
  projectId: string
  prompts: string[]
  styleReference?: string
  replaceIndex?: number // Index to update/replace
  providerConfig: {
    provider: 'nanobanana' | 'midjourney'
    apiKey: string
    modelId?: string
    styleReferenceUrls?: string[] // Array of style refs from settings
  }
}

// Poll LegNext API task for completion
async function pollLegNextTask(
  jobId: string,
  apiKey: string,
  maxAttempts: number = 300,
  progressOffset: number = 30
): Promise<any> {
  let attempts = 0

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000))

    try {
      const fetchResponse = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
        },
      })

      if (fetchResponse.status === 404) {
        throw new Error('LegNext task not found')
      }

      if (!fetchResponse.ok) {
        const errorText = await fetchResponse.text()
        logger.warn(`LegNext polling error: ${fetchResponse.status} - ${errorText}`)
        attempts++
        continue
      }

      const data = await fetchResponse.json()
      const status = data.status

      // Progress estimation
      let progress = 0
      if (status === 'completed') progress = 100
      else if (status === 'processing') progress = 50 + (attempts % 40)
      else if (status === 'pending') progress = 10

      const scaledProgress = progressOffset + Math.round(progress * 0.65)
      await metadata.set('progress', scaledProgress)

      logger.info(`Polling job ${jobId}: Status = ${status}`, { attempt: attempts, scaledProgress })

      if (status === 'completed') {
        logger.info('LegNext task completed successfully')
        await metadata.set('progress', progressOffset + 65)
        return data
      } else if (status === 'failed') {
        const errorMsg = data.output?.error_messages?.join(', ') || data.message || 'Unknown error'
        logger.error('LegNext task failed', { error: errorMsg })
        throw new Error(errorMsg)
      }
    } catch (e: unknown) {
      logger.warn('Polling fetch error:', { error: getErrorMessage(e) })
      if (getErrorMessage(e)?.includes('not found')) throw e
    }

    attempts++
  }

  throw new Error('LegNext task timeout - Status did not reach completed')
}

export const generateMoodboard = task({
  id: 'generate-moodboard',
  maxDuration: 600, // 10 mins (increased for MJ polling)
  run: async (payload: GenerateMoodboardPayload) => {
    const { projectId, prompts, styleReference, providerConfig, replaceIndex } = payload
    const { provider, apiKey, modelId, styleReferenceUrls } = providerConfig
    const generatedFilenames: string[] = []

    logger.info(`Starting moodboard generation for project ${projectId}`, {
      provider,
      promptCount: prompts.length,
      replaceIndex,
    })

    // Initialize progress metadata
    await metadata.set('progress', 0)
    await metadata.set('stage', 'initializing')
    await metadata.set('project_id', projectId)
    await metadata.set('provider', provider)

    // Prepare Style References
    // Combine legacy `styleReference` string with new `styleReferenceUrls` array
    const allStyleRefs = [
      ...(styleReference ? [styleReference] : []),
      ...(styleReferenceUrls || []),
    ].filter(Boolean)

    // 1. Generate Images
    for (let i = 0; i < prompts.length; i++) {
      const prompt = prompts[i]
      await metadata.set('stage', `generating_image_${i + 1}_of_${prompts.length}`)
      await metadata.set('progress', Math.round((i / prompts.length) * 70))

      try {
        let imageBase64: string | null = null
        // Construct prompt
        const enhancedPrompt = `${prompt}. Concept art, high fidelity, moody, cinematic lighting.`

        if (provider === 'midjourney') {
          // MIDJOURNEY via LegNext diffusion API
          logger.info('Generating with Midjourney (LegNext diffusion)', { promptIndex: i })

          // Build image prompt (first URL) + core prompt + --sref (all URLs)
          const imagePromptPart = allStyleRefs.length > 0 ? `${allStyleRefs[0]} ` : ''
          let fullPrompt = `${imagePromptPart}${enhancedPrompt} --v 7 --ar 16:9`

          // Append Style References (--sref url1 url2)
          if (allStyleRefs.length > 0) {
            fullPrompt += ` --sref ${allStyleRefs.join(' ')}`
          }

          logger.info('Using prompt', { fullPrompt })

          const diffusionPayload = {
            text: fullPrompt,
          }

          // Log LLM request start
          logLLMRequestStart({
            provider: 'midjourney',
            model: 'legnext-diffusion',
            prompt: fullPrompt,
            inputImageUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
            input: diffusionPayload,
            metadata: {
              task: 'moodboard-generation',
              promptIndex: i,
            },
          })

          // Submit diffusion task
          await metadata.set('stage', 'submitting_diffusion')
          const diffusionResponse = await fetch('https://api.legnext.ai/api/v1/diffusion', {
            method: 'POST',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(diffusionPayload),
          })

          if (!diffusionResponse.ok) {
            const errorText = await diffusionResponse.text()
            logger.error(`LegNext diffusion failed: ${diffusionResponse.status}`, {
              error: errorText,
            })
            logLLMRequestError({
              provider: 'midjourney',
              model: 'legnext-diffusion',
              prompt: fullPrompt,
              error: `HTTP ${diffusionResponse.status}: ${errorText}`,
              input: diffusionPayload,
            })
            continue
          }

          const diffusionData = await diffusionResponse.json()
          const jobId = diffusionData.job_id

          if (!jobId) {
            logger.error('LegNext diffusion failed: No job_id returned')
            logLLMRequestError({
              provider: 'midjourney',
              model: 'legnext-diffusion',
              prompt: fullPrompt,
              error: 'No job_id returned',
              input: diffusionPayload,
              output: diffusionData,
            })
            continue
          }

          await metadata.set('diffusion_job_id', jobId)
          logger.info('Diffusion task submitted', { jobId })

          // Poll for completion
          await metadata.set('stage', 'waiting_diffusion')
          const result = await pollLegNextTask(jobId, apiKey, 300, 30)

          // Get first variant from image_urls array
          const imageUrl = result.output?.image_urls?.[0] || result.output?.image_url

          if (!imageUrl) {
            logger.error('LegNext diffusion result missing image_url')
            logLLMRequestError({
              provider: 'midjourney',
              model: 'legnext-diffusion',
              prompt: fullPrompt,
              error: 'Result missing image_url',
              input: diffusionPayload,
              output: result,
            })
            continue
          }

          // Log successful completion
          logLLMRequestComplete({
            provider: 'midjourney',
            model: 'legnext-diffusion',
            prompt: fullPrompt,
            outputImageUrls: [imageUrl],
            output: result.output,
          })

          logger.info('Midjourney generation completed', { imageUrl })

          // Download image
          await metadata.set('stage', 'downloading_image')
          const imgRes = await fetch(imageUrl)
          if (!imgRes.ok) {
            logger.error('Failed to fetch generated image', { status: imgRes.status })
            continue
          }
          const arrayBuffer = await imgRes.arrayBuffer()
          imageBase64 = Buffer.from(arrayBuffer).toString('base64')
        } else if (provider === 'nanobanana') {
          // NANO BANANA uses Gemini API for image generation
          const targetModel = modelId || 'gemini-2.0-flash-preview-image-generation'
          logger.info('Generating with Nano Banana', { model: targetModel, promptIndex: i })

          const payload = {
            contents: [
              {
                parts: [{ text: enhancedPrompt }],
              },
            ],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            },
          }

          // Log LLM request start
          logLLMRequestStart({
            provider: 'gemini',
            model: targetModel,
            prompt: enhancedPrompt,
            inputImageUrls: allStyleRefs.length > 0 ? allStyleRefs : undefined,
            input: payload,
            metadata: {
              task: 'moodboard-generation',
              promptIndex: i,
              provider: 'nanobanana',
            },
          })

          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            }
          )

          if (!response.ok) {
            const errText = await response.text()
            logger.error('Nano Banana API Error', { model: targetModel, error: errText })
            logLLMRequestError({
              provider: 'gemini',
              model: targetModel,
              prompt: enhancedPrompt,
              error: `HTTP ${response.status}: ${errText}`,
              input: payload,
            })
            continue
          }

          const data = await response.json()

          // Parse response for image data
          if (data.candidates?.[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
              if (part.inline_data?.data) {
                imageBase64 = part.inline_data.data
                logger.info('Found image in inline_data')
                break
              }
              if (part.inlineData?.data) {
                imageBase64 = part.inlineData.data
                logger.info('Found image in inlineData')
                break
              }
            }
          }

          if (!imageBase64) {
            logger.warn('Nano Banana did not return an image', { model: targetModel })
            logLLMRequestError({
              provider: 'gemini',
              model: targetModel,
              prompt: enhancedPrompt,
              error: 'No image returned in response',
              input: payload,
              output: data,
            })
          } else {
            // Log successful completion
            logLLMRequestComplete({
              provider: 'gemini',
              model: targetModel,
              prompt: enhancedPrompt,
              outputImageUrls: ['[Base64 Image Data]'],
              output: {
                finishReason: data.candidates?.[0]?.finishReason,
                hasImage: true,
              },
            })
          }
        }

        if (imageBase64) {
          // 2. Save to Disk
          await metadata.set('stage', 'saving_image')
          const filename = `mood_${Date.now()}_${Math.random().toString(36).substring(7)}.png`
          const projectDir = path.join(process.cwd(), 'public', 'projects', projectId)

          if (!fs.existsSync(projectDir)) {
            fs.mkdirSync(projectDir, { recursive: true })
          }

          const buffer: Buffer = Buffer.from(imageBase64, 'base64')

          fs.writeFileSync(path.join(projectDir, filename), buffer)
          generatedFilenames.push(filename)
          logger.info('Image saved', { filename })
        }
      } catch (error) {
        logger.error('Failed to generate image for prompt', { prompt, error })
      }
    }

    // 3. Update Database with retry logic for concurrent updates
    await metadata.set('stage', 'updating_database')
    await metadata.set('progress', 90)

    if (generatedFilenames.length > 0) {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Retry logic to handle concurrent updates
      const maxRetries = 3
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          // STRATEGY: Update BOTH 'projects' (legacy/backup) and 'story_plans' (primary)

          // 1. Fetch current state effectively
          // Try fetching from story_plans table first (primary)
          const { data: storyPlanRow } = await supabase
            .from('story_plans')
            .select('content')
            .eq('project_id', projectId)
            .single()

          // Also fetch legacy to ensure we don't break it
          const { data: project } = await supabase
            .from('projects')
            .select('story_plan')
            .eq('id', projectId)
            .single()

          if (!project) {
            logger.error('Project not found')
            break
          }

          // Merge logic: use story_plans content if available, else legacy
          const currentContent = storyPlanRow?.content || project.story_plan || {}
          const currentImages = currentContent.moodImages || []
          let newImages: string[]

          if (typeof replaceIndex === 'number' && replaceIndex >= 0) {
            // Replace mode
            newImages = [...currentImages]
            while (newImages.length <= replaceIndex) newImages.push('')
            if (generatedFilenames[0]) newImages[replaceIndex] = generatedFilenames[0]
          } else {
            // Append mode
            newImages = [...currentImages, ...generatedFilenames]
          }

          const newContent = {
            ...currentContent,
            moodImages: newImages,
          }

          // 2. Update Legacy Column
          const { error: legacyError } = await supabase
            .from('projects')
            .update({ story_plan: newContent })
            .eq('id', projectId)

          if (legacyError) throw legacyError

          // 3. Upsert Story Plans Table (Primary)
          const { error: primaryError } = await supabase.from('story_plans').upsert(
            {
              project_id: projectId,
              content: newContent,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'project_id' }
          )

          if (primaryError) throw primaryError

          logger.info('Updated DB with moodImages (Synced both tables)', {
            index: replaceIndex ?? 'append',
            count: newImages.length,
          })
          break
        } catch (dbError) {
          logger.error(`Database error on attempt ${attempt + 1}`, { error: dbError })
          if (attempt < maxRetries - 1) {
            await new Promise(r => setTimeout(r, 500 * (attempt + 1)))
          }
        }
      }
    }

    await metadata.set('progress', 100)
    await metadata.set('stage', 'completed')
    logger.info('Moodboard generation completed', { images: generatedFilenames })

    return {
      success: true,
      images: generatedFilenames,
    }
  },
})
