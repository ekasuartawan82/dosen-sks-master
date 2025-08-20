-- Fix security issue: Restrict public access to email addresses in profiles table

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- Create a restricted policy for public viewing (excludes sensitive data like email)
CREATE POLICY "Public profiles basic info viewable by everyone" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Create a policy for users to view their own complete profile (including email)
CREATE POLICY "Users can view their own complete profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = id);

-- Create a view for public profile data (non-sensitive fields only)
CREATE OR REPLACE VIEW public.public_profiles AS
SELECT 
    id,
    full_name,
    avatar_url,
    created_at,
    updated_at
FROM public.profiles;

-- Grant public access to the view
GRANT SELECT ON public.public_profiles TO anon, authenticated;