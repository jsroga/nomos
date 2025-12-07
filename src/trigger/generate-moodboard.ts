import { task, logger, metadata } from '@trigger.dev/sdk/v3'
import { createClient } from '@supabase/supabase-js'

// Comet API helpers
async function pollCometTask(
    taskId: string,
    apiKey: string,
    maxAttempts: number = 300
): Promise<any> {
    let attempts = 0
    while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        try {
            const res = await fetch(`https://api.cometapi.com/mj/task/${taskId}/fetch`, {
                headers: { Authorization: `Bearer ${apiKey}` }
            })
            const data = await res.json()
            const result = data.result || data

            if (result.status === 'SUCCESS') return result
            if (result.status === 'FAILED') throw new Error(result.failReason || 'Task failed')
        } catch (e: any) {
            if (e.message?.includes('FAILED')) throw e
            logger.warn('Polling error', { error: e.message })
        }
        attempts++
    }
    throw new Error('Task timeout')
}

async function imagineWithMidjourney(
    prompt: string,
    apiKey: string,
    srefUrls?: string | string[]
): Promise<{ imageUrl: string, taskId: string }> {
    // Support both single URL and array of URLs for backward compatibility
    const srefParam = srefUrls 
        ? Array.isArray(srefUrls) 
            ? srefUrls.length > 0 ? `--sref ${srefUrls.join(' ')} ` : ''
            : `--sref ${srefUrls} `
        : ''
    const finalPrompt = `${srefParam}${prompt} --v 6.1 --q 2 --s 250`.trim()

    logger.info("Submitting Imagine", { prompt: finalPrompt })

    const res = await fetch('https://api.cometapi.com/mj/submit/imagine', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            botType: 'MID_JOURNEY',
            prompt: finalPrompt,
            accountFilter: { modes: ['FAST'] }
        })
    })

    const data = await res.json()
    if (data.code !== 1) throw new Error(data.description || 'Imagine failed')

    const imagineResult = await pollCometTask(data.result, apiKey)

    // Find U1
    const u1 = (imagineResult.buttons || []).find((b: any) => b.label === 'U1')
    if (!u1) {
        return { imageUrl: imagineResult.imageUrl, taskId: data.result }
    }

    // Upscale U1
    logger.info("Upscaling U1")
    const actRes = await fetch('https://api.cometapi.com/mj/submit/action', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ customId: u1.customId, taskId: data.result })
    })
    const actData = await actRes.json()
    const upscaleResult = await pollCometTask(actData.result, apiKey)

    return { imageUrl: upscaleResult.imageUrl, taskId: actData.result }
}

export const generateMoodboardTask = task({
    id: 'generate-moodboard',
    maxDuration: 1800, // 30m
    run: async (payload: {
        projectId: string
        worldPrompt: string
        scenePrompts: string[] // 2 additional prompts
        mjApiKey: string
        styleReferenceUrls?: string[]
    }) => {
        const { projectId, worldPrompt, scenePrompts, mjApiKey, styleReferenceUrls } = payload
        logger.info("Starting moodboard generation", { projectId })

        await metadata.set('stage', 'image_1')

        // 1. Generate First Image (Style Anchor) - use project style references if available
        const img1 = await imagineWithMidjourney(worldPrompt, mjApiKey, styleReferenceUrls)
        const img1Url = img1.imageUrl
        logger.info("Image 1 Generated", { url: img1Url })

        // Save to DB immediately (partial update)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        // Helper to save locally
        const saveImage = async (url: string, index: number) => {
            const fs = await import('fs')
            const path = await import('path')
            const timestamp = Date.now()
            const filename = `mood_${projectId}_${index}_${timestamp}.png`
            const dir = path.join(process.cwd(), 'public', 'projects', projectId)

            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

            const buf = await (await fetch(url)).arrayBuffer()
            fs.writeFileSync(path.join(dir, filename), Buffer.from(buf))
            return filename
        }

        const file1 = await saveImage(img1Url, 1)

        // Update DB
        let currentFiles = [file1]
        await supabase.from('projects').select('series_bible').eq('id', projectId).single().then(({ data }) => {
            const bible = data?.series_bible || {}
            const newBible = { ...bible, moodImages: currentFiles }
            supabase.from('projects').update({ series_bible: newBible }).eq('id', projectId).then()
        })

        // 2. Generate Next 2 Images using Image 1 as SREF (combined with project refs if available)
        await metadata.set('stage', 'image_2_3')

        // Combine first generated image with project style references
        const combinedSrefs = styleReferenceUrls?.length 
            ? [img1Url, ...styleReferenceUrls]
            : img1Url

        const results = await Promise.all(scenePrompts.map(async (p, i) => {
            // Use Image 1 URL + project style references
            const res = await imagineWithMidjourney(p, mjApiKey, combinedSrefs)
            const file = await saveImage(res.imageUrl, i + 2)
            return file
        }))

        currentFiles = [file1, ...results]

        // Final DB Update
        await supabase.from('projects').select('series_bible').eq('id', projectId).single().then(({ data }) => {
            const bible = data?.series_bible || {}
            const newBible = { ...bible, moodImages: currentFiles }
            return supabase.from('projects').update({ series_bible: newBible }).eq('id', projectId)
        })

        return { success: true, images: currentFiles }
    }
})
