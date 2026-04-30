-- Production hardening: core academic data should not be mutable by anonymous visitors.
-- Authenticated users keep full access for the current MVP admin workflow.

DROP POLICY IF EXISTS "Allow all operations on courses" ON public.courses;
DROP POLICY IF EXISTS "Allow all operations on assignments" ON public.assignments;
DROP POLICY IF EXISTS "Allow all operations on classes" ON public.classes;
DROP POLICY IF EXISTS "Allow all operations on settings" ON public.settings;
DROP POLICY IF EXISTS "Allow all operations on schedules" ON public.schedules;

CREATE POLICY "Authenticated users can view courses"
ON public.courses FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create courses"
ON public.courses FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update courses"
ON public.courses FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete courses"
ON public.courses FOR DELETE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view assignments"
ON public.assignments FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create assignments"
ON public.assignments FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update assignments"
ON public.assignments FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete assignments"
ON public.assignments FOR DELETE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view classes"
ON public.classes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create classes"
ON public.classes FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update classes"
ON public.classes FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete classes"
ON public.classes FOR DELETE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view settings"
ON public.settings FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create settings"
ON public.settings FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update settings"
ON public.settings FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete settings"
ON public.settings FOR DELETE TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view schedules"
ON public.schedules FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create schedules"
ON public.schedules FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update schedules"
ON public.schedules FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete schedules"
ON public.schedules FOR DELETE TO authenticated
USING (true);
