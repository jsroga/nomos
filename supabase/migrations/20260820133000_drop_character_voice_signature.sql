-- Character voice signature is no longer a stored field.
ALTER TABLE characters DROP COLUMN IF EXISTS voice_signature;
