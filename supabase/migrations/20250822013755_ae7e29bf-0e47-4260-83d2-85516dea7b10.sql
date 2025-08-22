-- Fix the function search path security issue
CREATE OR REPLACE FUNCTION public.check_schedule_conflicts(
  p_assignment_id UUID,
  p_day_of_week INTEGER,
  p_time_slot INTEGER,
  p_exclude_schedule_id UUID DEFAULT NULL
)
RETURNS TABLE(
  conflicted_lecturer_name TEXT,
  conflicted_class_name TEXT,
  conflicted_course_name TEXT
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.name as conflicted_lecturer_name,
    c.name as conflicted_class_name,
    cr.name as conflicted_course_name
  FROM public.schedules s
  JOIN public.assignments a ON s.assignment_id = a.id
  JOIN public.lecturers l ON a.lecturer_id = l.id
  JOIN public.classes c ON a.class_id = c.id
  JOIN public.courses cr ON a.course_id = cr.id
  WHERE s.day_of_week = p_day_of_week
    AND s.time_slot = p_time_slot
    AND (p_exclude_schedule_id IS NULL OR s.id != p_exclude_schedule_id)
    AND a.lecturer_id = (
      SELECT lecturer_id FROM public.assignments WHERE id = p_assignment_id
    )
    AND a.id != p_assignment_id;
END;
$$;