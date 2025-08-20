-- Fix email exposure security issue
-- Remove public access to the main profiles table to protect email addresses
-- Users can only view their own complete profile, public can use the public_profiles view

-- Drop the public policy that exposes all profile data including emails
DROP POLICY IF EXISTS "Public profiles basic info viewable by everyone" ON public.profiles;

-- Keep only the policy that allows users to view their own complete profile
-- The "Users can view their own complete profile" policy already exists and is correct

-- Ensure the public_profiles view is the only way for public to access basic profile info
-- (This view was already created in the previous migration and excludes sensitive data)