-- Remap assignments from legacy mixed classes to program-scoped split classes.
--
-- Guard: every legacy assignment must have a class_split_map row for
-- old_class_id + course.program_id before any update is allowed.

DO $$
DECLARE
  unmatched_count integer;
BEGIN
  SELECT count(*)
  INTO unmatched_count
  FROM public.assignments a
  JOIN public.classes old_class ON old_class.id = a.class_id
  JOIN public.courses co ON co.id = a.course_id
  LEFT JOIN public.class_split_map m
    ON m.old_class_id = a.class_id
   AND m.program_id = co.program_id
  WHERE old_class.is_legacy = true
    AND old_class.legacy_reason LIKE 'INVALID_HISTORICAL_STRUCTURE%'
    AND m.new_class_id IS NULL;

  IF unmatched_count > 0 THEN
    RAISE EXCEPTION 'Legacy assignment remap blocked. unmatched assignments=%', unmatched_count;
  END IF;
END;
$$;

WITH legacy_assignments AS (
  SELECT
    a.id AS assignment_id,
    m.new_class_id
  FROM public.assignments a
  JOIN public.classes old_class ON old_class.id = a.class_id
  JOIN public.courses co ON co.id = a.course_id
  JOIN public.class_split_map m
    ON m.old_class_id = a.class_id
   AND m.program_id = co.program_id
  WHERE old_class.is_legacy = true
    AND old_class.legacy_reason LIKE 'INVALID_HISTORICAL_STRUCTURE%'
)
UPDATE public.assignments a
SET class_id = la.new_class_id
FROM legacy_assignments la
WHERE a.id = la.assignment_id;
