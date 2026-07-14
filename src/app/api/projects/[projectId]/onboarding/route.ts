import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getErrorMessage } from '@/shared/errors/error-utils'
import { API_ERROR, API_LOG_PREFIX } from '@/shared/data/constants/api-errors'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import { ApiErrorMessage } from '@/shared/data/constants/protocol'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { completed } = await req.json()
    const { projectId } = await params

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_IS_REQUIRED }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error } = await supabase
      .from(DB_TABLE.PROJECTS)
      .update({ [DB_COLUMN.ONBOARDING_COMPLETED]: completed })
      .eq(DB_COLUMN.ID, projectId)

    if (error) {
      console.error(API_LOG_PREFIX.ONBOARDING_UPDATE_FAILED, error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.ONBOARDING_API_ERROR, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || ApiErrorMessage.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params

    if (!projectId) {
      return NextResponse.json({ error: API_ERROR.PROJECT_ID_IS_REQUIRED }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { data, error } = await supabase
      .from(DB_TABLE.PROJECTS)
      .select(DB_COLUMN.ONBOARDING_COMPLETED)
      .eq(DB_COLUMN.ID, projectId)
      .single()

    if (error) {
      console.error(API_LOG_PREFIX.ONBOARDING_GET_FAILED, error)
      return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
    }

    return NextResponse.json({ onboarding_completed: data?.onboarding_completed ?? false })
  } catch (error: unknown) {
    console.error(API_LOG_PREFIX.ONBOARDING_API_ERROR, error)
    return NextResponse.json(
      { error: getErrorMessage(error) || ApiErrorMessage.INTERNAL_ERROR },
      { status: 500 }
    )
  }
}
