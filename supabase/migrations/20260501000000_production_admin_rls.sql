-- Production-safe access model before multi-user permissions are introduced.
-- Authenticated users may read core academic data, but only admins may mutate it.

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'user'
  )
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.current_user_role() = 'admin'
$$;

REVOKE ALL ON FUNCTION public.current_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Profiles: users can maintain basic profile fields, but cannot self-promote.
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles basic info viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own complete profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile without role escalation" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.is_admin());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND COALESCE(role, 'user') = 'user');

CREATE POLICY "Users can update own profile without role escalation"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND COALESCE(role, 'user') = public.current_user_role());

CREATE POLICY "Admins can update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- Core academic tables.
DROP POLICY IF EXISTS "Allow all operations on lecturers" ON public.lecturers;
DROP POLICY IF EXISTS "Authenticated users can view lecturers" ON public.lecturers;
DROP POLICY IF EXISTS "Authenticated users can create lecturers" ON public.lecturers;
DROP POLICY IF EXISTS "Authenticated users can update lecturers" ON public.lecturers;
DROP POLICY IF EXISTS "Authenticated users can delete lecturers" ON public.lecturers;
DROP POLICY IF EXISTS "Lecturers are readable by authenticated users" ON public.lecturers;
DROP POLICY IF EXISTS "Admins can create lecturers" ON public.lecturers;
DROP POLICY IF EXISTS "Admins can update lecturers" ON public.lecturers;
DROP POLICY IF EXISTS "Admins can delete lecturers" ON public.lecturers;

CREATE POLICY "Lecturers are readable by authenticated users"
ON public.lecturers FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create lecturers"
ON public.lecturers FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update lecturers"
ON public.lecturers FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete lecturers"
ON public.lecturers FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Allow all operations on courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can create courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can update courses" ON public.courses;
DROP POLICY IF EXISTS "Authenticated users can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Courses are readable by authenticated users" ON public.courses;
DROP POLICY IF EXISTS "Admins can create courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;

CREATE POLICY "Courses are readable by authenticated users"
ON public.courses FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create courses"
ON public.courses FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update courses"
ON public.courses FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete courses"
ON public.courses FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Programs are viewable by everyone" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can create programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can update programs" ON public.programs;
DROP POLICY IF EXISTS "Authenticated users can delete programs" ON public.programs;
DROP POLICY IF EXISTS "Programs are readable by authenticated users" ON public.programs;
DROP POLICY IF EXISTS "Admins can create programs" ON public.programs;
DROP POLICY IF EXISTS "Admins can update programs" ON public.programs;
DROP POLICY IF EXISTS "Admins can delete programs" ON public.programs;

CREATE POLICY "Programs are readable by authenticated users"
ON public.programs FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create programs"
ON public.programs FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update programs"
ON public.programs FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete programs"
ON public.programs FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Allow all operations on classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can view classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can create classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can update classes" ON public.classes;
DROP POLICY IF EXISTS "Authenticated users can delete classes" ON public.classes;
DROP POLICY IF EXISTS "Classes are readable by authenticated users" ON public.classes;
DROP POLICY IF EXISTS "Admins can create classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can update classes" ON public.classes;
DROP POLICY IF EXISTS "Admins can delete classes" ON public.classes;

CREATE POLICY "Classes are readable by authenticated users"
ON public.classes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create classes"
ON public.classes FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update classes"
ON public.classes FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete classes"
ON public.classes FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Allow all operations on assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can view assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can update assignments" ON public.assignments;
DROP POLICY IF EXISTS "Authenticated users can delete assignments" ON public.assignments;
DROP POLICY IF EXISTS "Assignments are readable by authenticated users" ON public.assignments;
DROP POLICY IF EXISTS "Admins can create assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins can update assignments" ON public.assignments;
DROP POLICY IF EXISTS "Admins can delete assignments" ON public.assignments;

CREATE POLICY "Assignments are readable by authenticated users"
ON public.assignments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create assignments"
ON public.assignments FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update assignments"
ON public.assignments FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete assignments"
ON public.assignments FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Allow all operations on schedules" ON public.schedules;
DROP POLICY IF EXISTS "Authenticated users can view schedules" ON public.schedules;
DROP POLICY IF EXISTS "Authenticated users can create schedules" ON public.schedules;
DROP POLICY IF EXISTS "Authenticated users can update schedules" ON public.schedules;
DROP POLICY IF EXISTS "Authenticated users can delete schedules" ON public.schedules;
DROP POLICY IF EXISTS "Schedules are readable by authenticated users" ON public.schedules;
DROP POLICY IF EXISTS "Admins can create schedules" ON public.schedules;
DROP POLICY IF EXISTS "Admins can update schedules" ON public.schedules;
DROP POLICY IF EXISTS "Admins can delete schedules" ON public.schedules;

CREATE POLICY "Schedules are readable by authenticated users"
ON public.schedules FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create schedules"
ON public.schedules FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update schedules"
ON public.schedules FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete schedules"
ON public.schedules FOR DELETE TO authenticated
USING (public.is_admin());

DROP POLICY IF EXISTS "Allow all operations on settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can view settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can create settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users can delete settings" ON public.settings;
DROP POLICY IF EXISTS "Settings are readable by authenticated users" ON public.settings;
DROP POLICY IF EXISTS "Admins can create settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can delete settings" ON public.settings;

CREATE POLICY "Settings are readable by authenticated users"
ON public.settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create settings"
ON public.settings FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update settings"
ON public.settings FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete settings"
ON public.settings FOR DELETE TO authenticated
USING (public.is_admin());

-- Announcements are internal for now. Admins manage all posts.
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
DROP POLICY IF EXISTS "Posts are readable by authenticated users" ON public.posts;
DROP POLICY IF EXISTS "Admins can create posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete posts" ON public.posts;

CREATE POLICY "Posts are readable by authenticated users"
ON public.posts FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can create posts"
ON public.posts FOR INSERT TO authenticated
WITH CHECK (public.is_admin() AND auth.uid() = user_id);

CREATE POLICY "Admins can update posts"
ON public.posts FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Admins can delete posts"
ON public.posts FOR DELETE TO authenticated
USING (public.is_admin());
