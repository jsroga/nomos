-- Enable RLS on interior_designs table
ALTER TABLE public.interior_designs ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations
-- Verify that the user_id column matches the authenticated user's ID
CREATE POLICY "Users can only see their own interior designs"
ON public.interior_designs
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
