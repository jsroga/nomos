-- Operator applies this; agents do not run it against live databases.
-- Host persist writes AfterBeatState on Approve. Kill emits zero persist.

ALTER TABLE beats
  ADD COLUMN IF NOT EXISTS after_beat_state jsonb NOT NULL DEFAULT '{}'::jsonb;
