-- Add active field to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Update RLS policy to only allow active users to access their data
CREATE POLICY "Active users can access their profile" ON public.profiles
  FOR SELECT
  USING (active = true AND id = auth.uid());

-- Ensure existing users are set as active
UPDATE public.profiles SET active = true WHERE active IS NULL;
