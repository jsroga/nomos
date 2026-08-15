export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          master_prompt: string | null
          series_bible: Json | null
          generation_mode: string | null
          style_anchor_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          master_prompt?: string | null
          series_bible?: Json | null
          generation_mode?: string | null
          style_anchor_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          master_prompt?: string | null
          series_bible?: Json | null
          generation_mode?: string | null
          style_anchor_url?: string | null
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
      assets: {
        Row: {
          id: string
          project_id: string
          image_filename: string
          model_filename: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          image_filename: string
          model_filename?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          image_filename?: string
          model_filename?: string | null
          metadata?: Json | null
          created_at?: string
        }
      }
    }
  }
}
