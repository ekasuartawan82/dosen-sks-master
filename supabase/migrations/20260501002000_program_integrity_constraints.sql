-- Program integrity audit/remediation baseline.
-- This migration models cross-program lecturer eligibility explicitly and
-- exposes audit views, but does not enable blocking assignment validation yet.

INSERT INTO public.programs (name, code, description)
VALUES
  ('D3 Manajemen Transportasi Jalan', 'MTJ', 'Program Studi D3 Manajemen Transportasi Jalan'),
  ('D3 Teknologi Otomotif', 'TO', 'Program Studi D3 Teknologi Otomotif'),
  ('D3 Manajemen Logistik', 'MLOG', 'Program Studi D3 Manajemen Logistik')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = now();

ALTER TABLE public.lecturers
ADD COLUMN IF NOT EXISTS home_program_id uuid REFERENCES public.programs(id);

UPDATE public.lecturers
SET home_program_id = program_id
WHERE home_program_id IS NULL
  AND program_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.lecturer_programs (
  lecturer_id uuid NOT NULL REFERENCES public.lecturers(id) ON DELETE CASCADE,
  program_id uuid NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lecturer_id, program_id)
);

INSERT INTO public.lecturer_programs (lecturer_id, program_id)
SELECT id, program_id
FROM public.lecturers
WHERE program_id IS NOT NULL
ON CONFLICT (lecturer_id, program_id) DO NOTHING;

ALTER TABLE public.lecturer_programs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lecturer programs are readable by app roles" ON public.lecturer_programs;
DROP POLICY IF EXISTS "Lecturer programs are insertable by admins" ON public.lecturer_programs;
DROP POLICY IF EXISTS "Lecturer programs are updatable by admins" ON public.lecturer_programs;
DROP POLICY IF EXISTS "Lecturer programs are deletable by admins" ON public.lecturer_programs;

CREATE POLICY "Lecturer programs are readable by app roles"
ON public.lecturer_programs FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Lecturer programs are insertable by admins"
ON public.lecturer_programs FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Lecturer programs are updatable by admins"
ON public.lecturer_programs FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Lecturer programs are deletable by admins"
ON public.lecturer_programs FOR DELETE TO authenticated
USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lecturer_programs TO authenticated;

-- Keep this phase remediation-friendly. If a previous local draft installed
-- the blocking trigger, remove it here; enforcement lives in the next migration.
DROP TRIGGER IF EXISTS trg_validate_assignment_program ON public.assignments;
DROP FUNCTION IF EXISTS public.validate_assignment_program();

CREATE OR REPLACE VIEW public.audit_classes_missing_program
WITH (security_invoker = true)
AS
SELECT
  c.id,
  c.name,
  c.level,
  c.created_at,
  c.updated_at
FROM public.classes c
WHERE c.program_id IS NULL;

CREATE OR REPLACE VIEW public.audit_assignment_program_mismatches
WITH (security_invoker = true)
AS
SELECT
  a.id AS assignment_id,
  a.course_id,
  co.name AS course_name,
  co.program_id AS course_program_id,
  a.class_id,
  cl.name AS class_name,
  cl.program_id AS class_program_id
FROM public.assignments a
JOIN public.courses co ON co.id = a.course_id
LEFT JOIN public.classes cl ON cl.id = a.class_id
WHERE a.class_id IS NULL
   OR co.program_id IS NULL
   OR cl.program_id IS NULL
   OR co.program_id IS DISTINCT FROM cl.program_id;

CREATE OR REPLACE VIEW public.audit_assignment_lecturer_program_gaps
WITH (security_invoker = true)
AS
SELECT
  a.id AS assignment_id,
  a.lecturer_id,
  l.name AS lecturer_name,
  a.class_id,
  cl.name AS class_name,
  cl.program_id AS class_program_id
FROM public.assignments a
JOIN public.lecturers l ON l.id = a.lecturer_id
LEFT JOIN public.classes cl ON cl.id = a.class_id
LEFT JOIN public.lecturer_programs lp
  ON lp.lecturer_id = a.lecturer_id
 AND lp.program_id = cl.program_id
WHERE a.class_id IS NULL
   OR cl.program_id IS NULL
   OR lp.lecturer_id IS NULL;

GRANT SELECT ON public.audit_classes_missing_program TO authenticated;
GRANT SELECT ON public.audit_assignment_program_mismatches TO authenticated;
GRANT SELECT ON public.audit_assignment_lecturer_program_gaps TO authenticated;

COMMENT ON COLUMN public.lecturers.home_program_id IS
'Primary/home program for reporting. Cross-program teaching eligibility is modeled explicitly in lecturer_programs.';

COMMENT ON TABLE public.lecturer_programs IS
'Explicit lecturer-to-program eligibility mapping. No row means the lecturer is not yet authorized for that program.';
