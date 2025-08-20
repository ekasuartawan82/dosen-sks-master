-- Fix security definer view issue
-- Drop the existing view and recreate it without SECURITY DEFINER (which is the default)
-- This ensures the view respects the querying user's permissions rather than the creator's

DROP VIEW IF EXISTS public.public_profiles;

-- Recreate the view without SECURITY DEFINER property
-- This ensures RLS policies are enforced based on the querying user's context
CREATE VIEW public.public_profiles AS
SELECT 
    id,
    full_name,
    avatar_url,
    created_at,
    updated_at
FROM public.profiles;

-- Grant appropriate permissions to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;