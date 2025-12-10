-- Add description and portrait_url to characters table
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "description" text;
ALTER TABLE "characters" ADD COLUMN IF NOT EXISTS "portrait_url" text;
