-- Add user_id column to assets table
-- This column was in the schema but missing from the database
ALTER TABLE assets
ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000'::UUID;

-- Add comment
COMMENT ON COLUMN assets.user_id IS 'User who owns this asset';
