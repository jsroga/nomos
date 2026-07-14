import { NextRequest, NextResponse } from 'next/server'
import { regenerateText } from '@/domains/storyteller/server'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { withAuth, type AuthenticatedRequest } from '@/shared/data/api-utils'

export const POST = withAuth(async (req: NextRequest, _auth: AuthenticatedRequest) => {
  try {
    const { selection, instruction } = await req.json()

    if (!selection || !instruction) {
      return NextResponse.json({ error: API_ERROR.MISSING_SELECTION_OR_INSTRUCTION }, { status: 400 })
    }

    const result = await regenerateText(selection, instruction)

    return NextResponse.json({ result })
  } catch (error) {
    console.error(API_LOG_PREFIX.SCRIPT_EDIT_ERROR, error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : API_ERROR.FAILED_EDIT_SCRIPT },
      { status: 500 }
    )
  }
})
