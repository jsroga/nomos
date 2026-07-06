/**
 * Market Analysis API Endpoint
 *
 * Streams market analysis results using SSE.
 */

import { NextRequest } from 'next/server'
import {
  streamMarketAnalysis,
  type LoopAnalysisInput,
} from '@/domains/loop-creator/server'

export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes max for thorough analysis

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const input: LoopAnalysisInput = {
      mechanics: body.mechanics || [],
      connections: body.connections || [],
      loops: body.loops || [],
      gameGenre: body.gameGenre || 'indie',
      gamePlatform: body.gamePlatform || 'pc',
      targetAudience: body.targetAudience || 'core',
      gameDescription: body.gameDescription || '',
    }

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamMarketAnalysis(input)) {
            const data = JSON.stringify(event)
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', content: errorMessage })}\n\n`)
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Market analysis error:', error)
    return new Response(JSON.stringify({ error: 'Failed to start market analysis' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
