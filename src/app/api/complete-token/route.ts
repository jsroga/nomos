import { NextResponse } from 'next/server'
import { wait } from '@trigger.dev/sdk'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'

export async function POST(request: Request) {
  try {
    const { tokenId, action, variantIndex } = await request.json()

    if (!tokenId || !action || variantIndex === undefined) {
      return NextResponse.json({ error: API_ERROR.MISSING_REQUIRED_FIELDS }, { status: 400 })
    }

    await wait.completeToken(tokenId, { action, variantIndex })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(API_LOG_PREFIX.COMPLETE_TOKEN_ERROR, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.FAILED_COMPLETE_TOKEN },
      { status: 500 }
    )
  }
}
