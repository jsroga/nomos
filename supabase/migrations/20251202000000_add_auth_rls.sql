-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- Add user_id to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- Enable RLS on assets and select_points
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.select_points ENABLE ROW LEVEL SECURITY;

-- Update Policies for Projects (Users can only see their own projects)
DROP POLICY IF EXISTS "Allow all operations on projects" ON public.projects;
CREATE POLICY "Users can only see their own projects" ON public.projects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Update Policies for Tiles (Users can only see tiles of their projects)
DROP POLICY IF EXISTS "Allow all operations on tiles" ON public.tiles;
CREATE POLICY "Users can see tiles of their projects" ON public.tiles
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = tiles.project_id AND user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE id = tiles.project_id AND user_id = auth.uid())
    );

-- Update Policies for Assets
CREATE POLICY "Users can see assets of their projects" ON public.assets
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = assets.project_id AND user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE id = assets.project_id AND user_id = auth.uid())
    );

-- Update Policies for Select Points
CREATE POLICY "Users can see select points of their projects" ON public.select_points
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.projects WHERE id = select_points.project_id AND user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.projects WHERE id = select_points.project_id AND user_id = auth.uid())
    );

-- Storage Buckets Policies (If using Supabase Storage)
-- Assuming bucket 'projects' exists
-- insert into storage.buckets (id, name) values ('projects', 'projects');
-- create policy "Users can upload their own project assets"
--   on storage.objects for insert
--   with check ( bucket_id = 'projects' AND auth.role() = 'authenticated' );
-- create policy "Users can view their own project assets"
--   on storage.objects for select
--   using ( bucket_id = 'projects' AND auth.role() = 'authenticated' );

