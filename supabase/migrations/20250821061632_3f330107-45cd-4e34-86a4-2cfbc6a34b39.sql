-- Fix security vulnerability: Restrict access to lecturers table to authenticated users only

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on lecturers" ON public.lecturers;

-- Create secure RLS policies for the lecturers table

-- Allow authenticated users to view lecturers (needed for the application to function)
CREATE POLICY "Authenticated users can view lecturers" 
ON public.lecturers 
FOR SELECT 
TO authenticated 
USING (true);

-- Allow authenticated users to create lecturers (for adding new staff)
CREATE POLICY "Authenticated users can create lecturers" 
ON public.lecturers 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow authenticated users to update lecturers (for editing staff information)
CREATE POLICY "Authenticated users can update lecturers" 
ON public.lecturers 
FOR UPDATE 
TO authenticated 
USING (true);

-- Allow authenticated users to delete lecturers (for removing staff)
CREATE POLICY "Authenticated users can delete lecturers" 
ON public.lecturers 
FOR DELETE 
TO authenticated 
USING (true);

-- Ensure RLS is enabled on the lecturers table
ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;