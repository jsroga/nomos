export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          project_prompt: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          project_prompt?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          project_prompt?: string | null
          created_at?: string
        }
      }
      tiles: {
        Row: {
          id: string
          project_id: string
          x: number
          y: number
          tile_prompt: string | null
          image_filename: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          x: number
          y: number
          tile_prompt?: string | null
          image_filename: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          x?: number
          y?: number
          tile_prompt?: string | null
          image_filename?: string
          created_at?: string
        }
      }
    }
  }
}
