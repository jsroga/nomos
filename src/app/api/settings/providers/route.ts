import { env } from '@/shared/config/env'
import { requireAuth } from '@/shared/data/api-utils'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAuth()
  if (error) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const openrouter = !!env.OPENROUTER_API_KEY
  const apiframe = !!env.APIFRAME_API_KEY

  return NextResponse.json({
    providers: {
      openrouter,
      // Text LLMs route via OpenRouter — direct vendor keys are optional fallbacks only.
      openai: openrouter || !!env.OPENAI_API_KEY,
      anthropic: openrouter || !!env.ANTHROPIC_API_KEY,
      google: openrouter || !!env.GOOGLE_API_KEY,
      apiframe,
      legnext: false,
      stability: apiframe,
      replicate: apiframe,
      hyper3d: !!env.HYPER3D_API_KEY,
      meshy: !!env.MESHY_API_KEY,
      fal: !!env.FAL_KEY,
      voyage: openrouter,
    },
  })
}
