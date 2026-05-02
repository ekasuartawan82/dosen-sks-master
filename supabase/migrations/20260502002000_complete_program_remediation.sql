-- Complete active-data remediation before enforcement.
--
-- 1. Mark no-data classes as legacy/read-only without assigning a program.
-- 2. Populate lecturer_programs only from active, non-legacy assignments whose
--    class already has a program_id.

UPDATE public.classes c
SET is_legacy = true,
    legacy_reason = 'NO_DATA_NO_ASSIGNMENT_EVIDENCE',
    updated_at = now()
WHERE c.program_id IS NULL
  AND coalesce(c.is_legacy, false) = false
  AND NOT EXISTS (
    SELECT 1
    FROM public.assignments a
    WHERE a.class_id = c.id
  );

INSERT INTO public.lecturer_programs (lecturer_id, program_id)
SELECT DISTINCT a.lecturer_id, c.program_id
FROM public.assignments a
JOIN public.classes c ON c.id = a.class_id
WHERE coalesce(c.is_legacy, false) = false
  AND c.program_id IS NOT NULL
ON CONFLICT (lecturer_id, program_id) DO NOTHING;
