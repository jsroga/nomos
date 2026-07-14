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
import {
  LoopGameAudienceDefault,
  LoopGameGenreDefault,
  LoopGamePlatformDefault,
  MARKET_ANALYSIS_SSE_DATA_PREFIX,
  MARKET_ANALYSIS_SSE_HEADERS,
  MarketAnalysisStreamDoneEvent,
  MarketAnalysisStreamEvent,
} from '@/domains/loop-creator/constants/market-analysis'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { ContentType } from '@/shared/data/constants/protocol'

// eslint-disable-next-line local/no-magic-string -- Next.js segment config must be a statically analyzable literal (user-approved exception, 2026-07-09)
export const runtime = 'nodejs'
export const maxDuration = 120 // 2 minutes max for thorough analysis

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const input: LoopAnalysisInput = {
      mechanics: body.mechanics || [],
      connections: body.connections || [],
      loops: body.loops || [],
      gameGenre: body.gameGenre || LoopGameGenreDefault.Indie,
      gamePlatform: body.gamePlatform || LoopGamePlatformDefault.Pc,
      targetAudience: body.targetAudience || LoopGameAudienceDefault.Core,
      gameDescription: body.gameDescription || '',
    }

    // Create SSE stream
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of streamMarketAnalysis(input)) {
            const data = JSON.stringify(event)
            controller.enqueue(encoder.encode(`${MARKET_ANALYSIS_SSE_DATA_PREFIX}${data}\n\n`))
          }

          controller.enqueue(
            encoder.encode(
              `${MARKET_ANALYSIS_SSE_DATA_PREFIX}${JSON.stringify({ type: MarketAnalysisStreamDoneEvent.Done })}\n\n`
            )
          )
          controller.close()
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : API_ERROR.UNKNOWN_ERROR
          controller.enqueue(
            encoder.encode(
              `${MARKET_ANALYSIS_SSE_DATA_PREFIX}${JSON.stringify({ type: MarketAnalysisStreamEvent.Error, content: errorMessage })}\n\n`
            )
          )
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': MARKET_ANALYSIS_SSE_HEADERS.CONTENT_TYPE,
        'Cache-Control': MARKET_ANALYSIS_SSE_HEADERS.CACHE_CONTROL,
        Connection: MARKET_ANALYSIS_SSE_HEADERS.CONNECTION,
      },
    })
  } catch (error) {
    console.error(API_LOG_PREFIX.MARKET_ANALYSIS_ERROR, error)
    return new Response(JSON.stringify({ error: API_ERROR.FAILED_START_MARKET_ANALYSIS }), {
      status: 500,
      headers: { 'Content-Type': ContentType.Json },
    })
  }
}
