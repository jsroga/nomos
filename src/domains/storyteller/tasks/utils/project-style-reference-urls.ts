import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'
import { StyleRefOwner, styleRefColumn } from '@/shared/canvas/style-refs/style-ref-owner'

export async function fetchProjectStyleReferenceUrls(projectId: string): Promise<string[]> {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from(DB_TABLE.PROJECTS)
    .select(styleRefColumn(StyleRefOwner.Storyteller))
    .eq(DB_COLUMN.ID, projectId)
    .maybeSingle()
  if (!data) return []
  return stringArrayFromJson(
    recordFromJson(data)[styleRefColumn(StyleRefOwner.Storyteller)],
  )
}
