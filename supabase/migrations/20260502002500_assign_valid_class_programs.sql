-- Assign validated active classes before enforcement.
--
-- Domain decision:
-- - Kelas D level 1 is a valid MLOG class.
-- - It is not a legacy split/no-data class.
-- - All existing assignments for this class must point to MLOG courses.

DO $$
DECLARE
  mlog_program_id uuid;
  active_kelas_d_count integer;
  unresolved_kelas_d_count integer;
  resolved_kelas_d_count integer;
  kelas_d_id uuid;
  assignment_count integer;
  non_mlog_assignment_count integer;
BEGIN
  SELECT id INTO mlog_program_id
  FROM public.programs
  WHERE code = 'MLOG';

  IF mlog_program_id IS NULL THEN
    RAISE EXCEPTION 'Program MLOG is required before assigning Kelas D';
  END IF;

  SELECT count(*) INTO active_kelas_d_count
  FROM public.classes
  WHERE name = 'Kelas D'
    AND level = 1
    AND coalesce(is_legacy, false) = false;

  IF active_kelas_d_count > 1 THEN
    RAISE EXCEPTION 'Expected at most one active Kelas D level 1 candidate, found %', active_kelas_d_count;
  END IF;

  SELECT count(*) INTO unresolved_kelas_d_count
  FROM public.classes
  WHERE name = 'Kelas D'
    AND level = 1
    AND program_id IS NULL
    AND coalesce(is_legacy, false) = false;

  SELECT count(*) INTO resolved_kelas_d_count
  FROM public.classes
  WHERE name = 'Kelas D'
    AND level = 1
    AND program_id = mlog_program_id
    AND coalesce(is_legacy, false) = false;

  IF unresolved_kelas_d_count > 1 THEN
    RAISE EXCEPTION 'Expected exactly one unresolved Kelas D level 1 candidate, found %', unresolved_kelas_d_count;
  END IF;

  IF unresolved_kelas_d_count = 0 THEN
    IF resolved_kelas_d_count = 1 THEN
      RETURN;
    END IF;

    RAISE EXCEPTION 'No unresolved Kelas D level 1 candidate found, and no existing MLOG assignment was found';
  END IF;

  SELECT id INTO kelas_d_id
  FROM public.classes
  WHERE name = 'Kelas D'
    AND level = 1
    AND program_id IS NULL
    AND coalesce(is_legacy, false) = false;

  SELECT count(*) INTO assignment_count
  FROM public.assignments
  WHERE class_id = kelas_d_id;

  IF assignment_count = 0 THEN
    RAISE EXCEPTION 'Kelas D level 1 cannot be assigned to MLOG without assignment evidence';
  END IF;

  SELECT count(*) INTO non_mlog_assignment_count
  FROM public.assignments a
  JOIN public.courses co ON co.id = a.course_id
  WHERE a.class_id = kelas_d_id
    AND co.program_id IS DISTINCT FROM mlog_program_id;

  IF non_mlog_assignment_count > 0 THEN
    RAISE EXCEPTION 'Kelas D level 1 has % assignments outside MLOG', non_mlog_assignment_count;
  END IF;

  UPDATE public.classes
  SET program_id = mlog_program_id,
      updated_at = now()
  WHERE id = kelas_d_id
    AND program_id IS NULL
    AND coalesce(is_legacy, false) = false;
END;
$$;

INSERT INTO public.lecturer_programs (lecturer_id, program_id)
SELECT DISTINCT a.lecturer_id, c.program_id
FROM public.assignments a
JOIN public.classes c ON c.id = a.class_id
WHERE c.name = 'Kelas D'
  AND c.level = 1
  AND c.program_id = (SELECT id FROM public.programs WHERE code = 'MLOG')
  AND coalesce(c.is_legacy, false) = false
ON CONFLICT (lecturer_id, program_id) DO NOTHING;
