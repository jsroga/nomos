-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  project_prompt TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create tiles table
CREATE TABLE IF NOT EXISTS public.tiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  tile_prompt TEXT,
  image_filename TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(project_id, x, y)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tiles_project_id ON public.tiles(project_id);
CREATE INDEX IF NOT EXISTS idx_tiles_coordinates ON public.tiles(project_id, x, y);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON public.projects(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiles ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (you can restrict this later based on auth)
CREATE POLICY "Allow all operations on projects" ON public.projects
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on tiles" ON public.tiles
  FOR ALL USING (true) WITH CHECK (true);
