-- Add Bible Lock System
-- Allows central users to lock the Series Bible to prevent editing

-- Add lock fields to series_bibles table (note: plural)
ALTER TABLE series_bibles
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS locked_by TEXT,
ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- Create index for locked Bibles
CREATE INDEX IF NOT EXISTS idx_series_bibles_locked ON series_bibles(is_locked) WHERE is_locked = TRUE;

-- Add comment
COMMENT ON COLUMN series_bibles.is_locked IS 'Whether the Bible is locked (only central users can edit when locked)';
COMMENT ON COLUMN series_bibles.locked_by IS 'Email of the user who locked the Bible';
COMMENT ON COLUMN series_bibles.locked_at IS 'Timestamp when the Bible was locked';

