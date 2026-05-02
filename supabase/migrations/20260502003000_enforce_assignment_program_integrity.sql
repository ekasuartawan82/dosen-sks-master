-- Program integrity enforcement.
-- Run only after all audit views return zero rows.

DO $$
DECLARE
  missing_class_program_count integer;
  assignment_program_mismatch_count integer;
  lecturer_program_gap_count integer;
BEGIN
  SELECT count(*) INTO missing_class_program_count
  FROM public.audit_classes_missing_program;

  SELECT count(*) INTO assignment_program_mismatch_count
  FROM public.audit_assignment_program_mismatches;

  SELECT count(*) INTO lecturer_program_gap_count
  FROM public.audit_assignment_lecturer_program_gaps;

  IF missing_class_program_count > 0
     OR assignment_program_mismatch_count > 0
     OR lecturer_program_gap_count > 0 THEN
    RAISE EXCEPTION
      'Assignment program integrity enforcement blocked. audit_classes_missing_program=%, audit_assignment_program_mismatches=%, audit_assignment_lecturer_program_gaps=%',
      missing_class_program_count,
      assignment_program_mismatch_count,
      lecturer_program_gap_count;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_assignment_program()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  course_program_id uuid;
  class_program_id uuid;
BEGIN
  IF NEW.class_id IS NULL THEN
    RAISE EXCEPTION 'Assignment class_id is required for program validation';
  END IF;

  SELECT program_id
  INTO course_program_id
  FROM public.courses
  WHERE id = NEW.course_id;

  SELECT program_id
  INTO class_program_id
  FROM public.classes
  WHERE id = NEW.class_id;

  IF course_program_id IS NULL THEN
    RAISE EXCEPTION 'Assignment course must belong to a program';
  END IF;

  IF class_program_id IS NULL THEN
    RAISE EXCEPTION 'Assignment class must belong to a program';
  END IF;

  IF course_program_id IS DISTINCT FROM class_program_id THEN
    RAISE EXCEPTION 'Course and class must belong to the same program';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.lecturer_programs
    WHERE lecturer_id = NEW.lecturer_id
      AND program_id = class_program_id
  ) THEN
    RAISE EXCEPTION 'Lecturer is not mapped to the assignment program';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_assignment_program() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_assignment_program() TO authenticated;

DROP TRIGGER IF EXISTS trg_validate_assignment_program ON public.assignments;
CREATE TRIGGER trg_validate_assignment_program
BEFORE INSERT OR UPDATE OF lecturer_id, course_id, class_id ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.validate_assignment_program();

COMMENT ON FUNCTION public.validate_assignment_program() IS
'Rejects assignments whose course, class, and lecturer-program mapping are not program-consistent.';
