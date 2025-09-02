-- Fix Security Definer View issue definitively
-- Drop and recreate the public_profiles view to ensure it doesn't have SECURITY DEFINER
-- The view should respect the querying user's permissions, not the creator's

-- First, drop the existing view completely
DROP VIEW IF EXISTS public.public_profiles CASCADE;

-- Recreate the view with explicit SECURITY INVOKER (default behavior)
-- This ensures the view uses the permissions of the user executing the query
CREATE VIEW public.public_profiles 
WITH (security_invoker = true) AS
SELECT 
    id,
    full_name,
    avatar_url,
    created_at,
    updated_at
FROM public.profiles;

-- Grant appropriate permissions
GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Add a comment to document the security properties
COMMENT ON VIEW public.public_profiles IS 'Public view of profile data with security_invoker enabled to respect querying user permissions';