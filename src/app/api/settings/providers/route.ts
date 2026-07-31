import { requireAuth } from '@/shared/data/api-utils'
import { API_ERROR } from '@/shared/data/constants/api-errors'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAuth()
  if (error) {
    return NextResponse.json({ error: API_ERROR.UNAUTHORIZED }, { status: 401 })
  }

  return NextResponse.json({
    providers: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      google: !!process.env.GOOGLE_API_KEY,
      legnext: !!process.env.LEGNEXT_API_KEY,
      stability: !!process.env.STABILITY_API_KEY,
      replicate: !!process.env.REPLICATE_API_TOKEN,
      hyper3d: !!process.env.HYPER3D_API_KEY,
      meshy: !!process.env.MESHY_API_KEY,
      fal: !!process.env.FAL_KEY,
      voyage: !!process.env.OPENROUTER_API_KEY,
    },
  })
}
