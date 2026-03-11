import { NextResponse } from 'next/server'
import { wait } from '@trigger.dev/sdk/v3'

export async function POST(request: Request) {
  try {
    const { tokenId, action, variantIndex } = await request.json()

    if (!tokenId || !action || variantIndex === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    await wait.completeToken(tokenId, { action, variantIndex })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error completing token:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to complete token' },
      { status: 500 }
    )
  }
}
