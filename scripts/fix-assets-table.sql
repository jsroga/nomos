-- Add missing user_id column to assets table
-- This fixes the "Upload failed" error

-- First, check if the column already exists (safe to run multiple times)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='assets' 
        AND column_name='user_id'
    ) THEN
        -- Add the user_id column with a default value for existing rows
        ALTER TABLE assets 
        ADD COLUMN user_id UUID NOT NULL DEFAULT '00000000-0000-0000-0000-000000000000';
        
        RAISE NOTICE 'Added user_id column to assets table';
    ELSE
        RAISE NOTICE 'user_id column already exists in assets table';
    END IF;
END $$;
