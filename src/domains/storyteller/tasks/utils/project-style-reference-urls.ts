import { createSupabaseServiceClient } from '@/shared/auth/supabase-service'
import { DB_COLUMN, DB_TABLE } from '@/shared/data/constants/db-tables'
import { recordFromJson, stringArrayFromJson } from '@/shared/data/json-guards'

export async function fetchProjectStyleReferenceUrls(projectId: string): Promise<string[]> {
  const supabase = createSupabaseServiceClient()
  const { data } = await supabase
    .from(DB_TABLE.PROJECTS)
    .select(DB_COLUMN.STYLE_REFERENCE_URLS)
    .eq(DB_COLUMN.ID, projectId)
    .maybeSingle()
  if (!data) return []
  return stringArrayFromJson(recordFromJson(data)[DB_COLUMN.STYLE_REFERENCE_URLS])
}
