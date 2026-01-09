-- Change: Move onboarding_completed from projects to user level
-- Store in Supabase auth.users user_metadata

-- Option 1: Use user_metadata in auth.users (no schema change needed, use Supabase auth API)
-- This SQL is for reference only - we'll use the auth API to update user_metadata

-- If keeping a separate table, uncomment this:
-- CREATE TABLE IF NOT EXISTS user_preferences (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
--   onboarding_completed BOOLEAN DEFAULT false,
--   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Remove the per-project column if it exists (cleanup from previous migration)
-- ALTER TABLE projects DROP COLUMN IF EXISTS onboarding_completed;

-- For now, we use Supabase auth user_metadata which doesn't require SQL migration
