export interface LegNextResponse {
    job_id: string
    status: string
    output?: {
        image_url?: string
        image_urls?: string[]
        error_messages?: string[]
    }
}

export async function submitImagineTask(
    prompt: string,
    apiKey: string
): Promise<string> {
    const response = await fetch('https://api.legnext.ai/api/v1/diffusion', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            text: prompt,
        }),
    })

    // LegNext returns { job_id: "..." } directly on success
    const data = await response.json()

    if (!response.ok) {
        throw new Error(`LegNext imagine failed: ${response.status} - ${JSON.stringify(data)}`)
    }

    if (!data.job_id) {
        throw new Error(`LegNext imagine failed: No job_id returned - ${JSON.stringify(data)}`)
    }

    return data.job_id
}

export async function submitUpscaleTask(
    jobId: string,
    imageNo: number,
    apiKey: string
): Promise<string> {
    const response = await fetch('https://api.legnext.ai/api/v1/upscale', {
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            jobId: jobId,
            imageNo: imageNo,
            type: 0 // 0 = Subtle, 1 = Creative
        }),
    })

    const data = await response.json()

    if (!response.ok) {
        throw new Error(`LegNext upscale failed: ${response.status} - ${JSON.stringify(data)}`)
    }

    if (!data.job_id) {
        throw new Error(`LegNext upscale failed: No job_id returned - ${JSON.stringify(data)}`)
    }

    return data.job_id
}

export async function pollLegNextTask(
    jobId: string,
    apiKey: string,
    maxAttempts = 60,
    intervalMs = 2000
): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(`https://api.legnext.ai/api/v1/job/${jobId}`, {
            method: 'GET',
            headers: {
                'x-api-key': apiKey,
            },
        })

        if (!response.ok) {
            throw new Error(`LegNext polling failed: ${response.status} - ${await response.text()}`)
        }

        const data = await response.json()
        // Status values: pending, staged, processing, failed, completed
        if (data.status === 'completed') {
            return data.output
        }

        if (data.status === 'failed') {
            const errorMsg = data.output?.error_messages?.join(', ') || data.message || 'Unknown error'
            throw new Error(`LegNext task failed: ${errorMsg}`)
        }

        await new Promise(resolve => setTimeout(resolve, intervalMs))
    }

    throw new Error('LegNext task timed out')
}

export function getConfig() {
    if (typeof window === 'undefined') return { apiKey: '' }
    const stored = localStorage.getItem('ai-config-legnext')
    return stored ? JSON.parse(stored) : { apiKey: '' }
}
