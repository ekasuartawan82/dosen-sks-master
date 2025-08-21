-- Drop existing unique constraint that only considers lecturer_id and course_id
ALTER TABLE public.assignments DROP CONSTRAINT IF EXISTS assignments_lecturer_id_course_id_key;

-- Create new unique constraint that includes class_id to allow same lecturer-course in different classes
ALTER TABLE public.assignments ADD CONSTRAINT assignments_lecturer_course_class_unique 
  UNIQUE (lecturer_id, course_id, class_id);