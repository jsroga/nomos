-- NOTE: RLS applies only to queries made through the request-scoped Supabase
-- client. The application's Drizzle path connects as a BYPASSRLS role, so these
-- policies do NOT protect it — tenancy there is enforced in application code.
-- See docs/DECISIONS.md ADR 0001.

-- Enable RLS on interior_designs table
ALTER TABLE public.interior_designs ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations
-- Verify that the user_id column matches the authenticated user's ID
CREATE POLICY "Users can only see their own interior designs"
ON public.interior_designs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
