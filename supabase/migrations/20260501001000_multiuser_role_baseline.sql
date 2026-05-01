-- Multi-user role baseline with conservative permissions.
-- New roles are recognized, but write access remains admin-only.

ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'operator', 'viewer', 'lecturer', 'user'));

COMMENT ON COLUMN public.profiles.role IS
'Access role. admin is active now; operator, viewer, and lecturer are staged for multi-user workflows.';

CREATE OR REPLACE FUNCTION public.has_app_role(allowed_roles text[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = ANY(allowed_roles)
$$;

CREATE OR REPLACE FUNCTION public.can_read_academic_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_app_role(ARRAY['admin', 'operator', 'viewer'])
$$;

CREATE OR REPLACE FUNCTION public.can_manage_academic_data()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_admin()
$$;

REVOKE ALL ON FUNCTION public.has_app_role(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_read_academic_data() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_academic_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_app_role(text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_read_academic_data() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_academic_data() TO authenticated;

DROP POLICY IF EXISTS "Lecturers are readable by authenticated users" ON public.lecturers;
DROP POLICY IF EXISTS "Courses are readable by authenticated users" ON public.courses;
DROP POLICY IF EXISTS "Programs are readable by authenticated users" ON public.programs;
DROP POLICY IF EXISTS "Classes are readable by authenticated users" ON public.classes;
DROP POLICY IF EXISTS "Assignments are readable by authenticated users" ON public.assignments;
DROP POLICY IF EXISTS "Schedules are readable by authenticated users" ON public.schedules;
DROP POLICY IF EXISTS "Settings are readable by authenticated users" ON public.settings;
DROP POLICY IF EXISTS "Posts are readable by authenticated users" ON public.posts;

DROP POLICY IF EXISTS "Lecturers are readable by app roles" ON public.lecturers;
DROP POLICY IF EXISTS "Courses are readable by app roles" ON public.courses;
DROP POLICY IF EXISTS "Programs are readable by app roles" ON public.programs;
DROP POLICY IF EXISTS "Classes are readable by app roles" ON public.classes;
DROP POLICY IF EXISTS "Assignments are readable by app roles" ON public.assignments;
DROP POLICY IF EXISTS "Schedules are readable by app roles" ON public.schedules;
DROP POLICY IF EXISTS "Settings are readable by app roles" ON public.settings;
DROP POLICY IF EXISTS "Posts are readable by app roles" ON public.posts;

CREATE POLICY "Lecturers are readable by app roles"
ON public.lecturers FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Courses are readable by app roles"
ON public.courses FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Programs are readable by app roles"
ON public.programs FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Classes are readable by app roles"
ON public.classes FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Assignments are readable by app roles"
ON public.assignments FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Schedules are readable by app roles"
ON public.schedules FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Settings are readable by app roles"
ON public.settings FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Posts are readable by app roles"
ON public.posts FOR SELECT TO authenticated
USING (public.can_read_academic_data());
