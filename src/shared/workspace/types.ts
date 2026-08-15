/** Minimal workspace project session shape shared across modules. */
export type WorkspaceProject = {
  id: string
  name: string
  user_id?: string
  master_prompt: string
  series_bible: Record<string, unknown>
  story_plan: Record<string, unknown>
  stylePreset?: string | null
  generationMode?: string | null
  description?: string | null
  created_at?: string
}
