     1|-- Create assets table
     2|CREATE TABLE IF NOT EXISTS public.assets (
     3|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     4|    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
     5|    image_filename TEXT NOT NULL,
     6|    model_filename TEXT, -- Added model_filename
     7|    metadata JSONB,
     8|    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
     9|);
    10|
    11|-- Create index for faster lookups
    12|CREATE INDEX IF NOT EXISTS idx_assets_project_id ON public.assets(project_id);
    13|
    14|-- Create select_points table to persist points per project
    15|CREATE TABLE IF NOT EXISTS public.select_points (
    16|    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    17|    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    18|    points JSONB NOT NULL,
    19|    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    20|    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    21|);
    22|
    23|-- Create unique constraint to ensure one record per project
    24|CREATE UNIQUE INDEX IF NOT EXISTS idx_select_points_project_id ON public.select_points(project_id);
    25|