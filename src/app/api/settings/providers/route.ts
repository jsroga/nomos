import { requireAuth } from '@/lib/api-utils'
import { NextResponse } from 'next/server'

export async function GET() {
  const { error } = await requireAuth()
  if (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      voyage: !!process.env.VOYAGE_API_KEY,
      langfuse: !!process.env.LANGFUSE_PUBLIC_KEY,
      langsmith: !!process.env.LANGCHAIN_API_KEY,
    },
  })
}
