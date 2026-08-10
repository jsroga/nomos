import { requireAuth } from '@/shared/data/api-utils'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAuth()
  if (error) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  const openrouter = !!process.env.OPENROUTER_API_KEY
  const apiframe = !!process.env.APIFRAME_API_KEY

  return NextResponse.json({
    providers: {
      openrouter,
      // Text LLMs route via OpenRouter — direct vendor keys are optional fallbacks only.
      openai: openrouter || !!process.env.OPENAI_API_KEY,
      anthropic: openrouter || !!process.env.ANTHROPIC_API_KEY,
      google: openrouter || !!process.env.GOOGLE_API_KEY,
      apiframe,
      legnext: false,
      stability: apiframe,
      replicate: apiframe,
      hyper3d: !!process.env.HYPER3D_API_KEY,
      meshy: !!process.env.MESHY_API_KEY,
      fal: !!process.env.FAL_KEY,
      voyage: openrouter,
    },
  })
}
