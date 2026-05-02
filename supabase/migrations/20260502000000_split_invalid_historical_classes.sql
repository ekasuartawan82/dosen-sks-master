-- Split invalid historical classes into program-scoped classes.
--
-- This migration does not remap assignments yet. It creates the target classes,
-- marks historically mixed classes as legacy/read-only, and prepares the map
-- used by the next remediation phase.

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS is_legacy boolean NOT NULL DEFAULT false;

ALTER TABLE public.classes
ADD COLUMN IF NOT EXISTS legacy_reason text;

CREATE TABLE IF NOT EXISTS public.class_split_map (
  old_class_id uuid NOT NULL REFERENCES public.classes(id),
  program_id uuid NOT NULL REFERENCES public.programs(id),
  new_class_id uuid NOT NULL REFERENCES public.classes(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (old_class_id, program_id),
  UNIQUE (new_class_id)
);

ALTER TABLE public.class_split_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Class split map is readable by app roles" ON public.class_split_map;
DROP POLICY IF EXISTS "Class split map is insertable by admins" ON public.class_split_map;
DROP POLICY IF EXISTS "Class split map is updatable by admins" ON public.class_split_map;
DROP POLICY IF EXISTS "Class split map is deletable by admins" ON public.class_split_map;

CREATE POLICY "Class split map is readable by app roles"
ON public.class_split_map FOR SELECT TO authenticated
USING (public.can_read_academic_data());

CREATE POLICY "Class split map is insertable by admins"
ON public.class_split_map FOR INSERT TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "Class split map is updatable by admins"
ON public.class_split_map FOR UPDATE TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Class split map is deletable by admins"
ON public.class_split_map FOR DELETE TO authenticated
USING (public.is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_split_map TO authenticated;

WITH invalid_classes AS (
  SELECT c.id, c.name, c.level
  FROM public.classes c
  JOIN public.assignments a ON a.class_id = c.id
  JOIN public.courses co ON co.id = a.course_id
  WHERE c.is_legacy = false
  GROUP BY c.id, c.name, c.level
  HAVING count(DISTINCT co.program_id) FILTER (WHERE co.program_id IS NOT NULL) > 1
)
UPDATE public.classes c
SET is_legacy = true,
    legacy_reason = 'INVALID_HISTORICAL_STRUCTURE: split per program; do not use for new assignments.',
    updated_at = now()
FROM invalid_classes ic
WHERE c.id = ic.id;

WITH invalid_classes AS (
  SELECT c.id, c.name, c.level
  FROM public.classes c
  WHERE c.is_legacy = true
    AND c.legacy_reason LIKE 'INVALID_HISTORICAL_STRUCTURE%'
),
needed_splits AS (
  SELECT
    ic.id AS old_class_id,
    ic.name AS old_name,
    ic.level,
    p.id AS program_id,
    p.code AS program_code,
    p.code || ' ' || ic.name AS new_name
  FROM invalid_classes ic
  CROSS JOIN public.programs p
  WHERE p.code IN ('MTJ', 'TO', 'MLOG')
)
INSERT INTO public.classes (name, level, program_id)
SELECT ns.new_name, ns.level, ns.program_id
FROM needed_splits ns
WHERE NOT EXISTS (
  SELECT 1
  FROM public.classes c
  WHERE c.name = ns.new_name
    AND c.level = ns.level
);

WITH invalid_classes AS (
  SELECT c.id, c.name, c.level
  FROM public.classes c
  WHERE c.is_legacy = true
    AND c.legacy_reason LIKE 'INVALID_HISTORICAL_STRUCTURE%'
),
needed_splits AS (
  SELECT
    ic.id AS old_class_id,
    ic.name AS old_name,
    ic.level,
    p.id AS program_id,
    p.code AS program_code,
    p.code || ' ' || ic.name AS new_name
  FROM invalid_classes ic
  CROSS JOIN public.programs p
  WHERE p.code IN ('MTJ', 'TO', 'MLOG')
)
INSERT INTO public.class_split_map (old_class_id, program_id, new_class_id)
SELECT ns.old_class_id, ns.program_id, c.id
FROM needed_splits ns
JOIN public.classes c
  ON c.name = ns.new_name
 AND c.level = ns.level
 AND c.program_id = ns.program_id
ON CONFLICT (old_class_id, program_id) DO UPDATE
SET new_class_id = EXCLUDED.new_class_id;

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
WHERE c.program_id IS NULL
  AND c.is_legacy = false;

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
WHERE coalesce(cl.is_legacy, false) = false
  AND (
    a.class_id IS NULL
    OR co.program_id IS NULL
    OR cl.program_id IS NULL
    OR co.program_id IS DISTINCT FROM cl.program_id
  );

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
WHERE coalesce(cl.is_legacy, false) = false
  AND (
    a.class_id IS NULL
    OR cl.program_id IS NULL
    OR lp.lecturer_id IS NULL
  );

GRANT SELECT ON public.audit_classes_missing_program TO authenticated;
GRANT SELECT ON public.audit_assignment_program_mismatches TO authenticated;
GRANT SELECT ON public.audit_assignment_lecturer_program_gaps TO authenticated;

COMMENT ON COLUMN public.classes.is_legacy IS
'Marks historical classes that are retained for audit but must not be used for new assignments.';

COMMENT ON TABLE public.class_split_map IS
'Maps historical mixed classes to newly created program-scoped replacement classes.';
