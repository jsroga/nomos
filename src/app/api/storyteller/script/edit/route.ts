import { NextRequest, NextResponse } from 'next/server'
import { regenerateText } from '@/domains/storyteller/services/script-operations'
import { withAuth, type AuthenticatedRequest } from '@/lib/api-utils'

export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { selection, instruction } = await req.json()

    if (!selection || !instruction) {
      return NextResponse.json({ error: 'Missing selection or instruction' }, { status: 400 })
    }

    const result = await regenerateText(selection, instruction)

    return NextResponse.json({ result })
  } catch (error) {
    console.error('Script edit error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to edit script' },
      { status: 500 }
    )
  }
})
