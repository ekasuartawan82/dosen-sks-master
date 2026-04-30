-- Scope lecturer-course-class assignments by academic year so workload and history
-- reports do not mix plotting data across semesters.
ALTER TABLE public.assignments
ADD COLUMN IF NOT EXISTS academic_year TEXT;

UPDATE public.assignments
SET academic_year = COALESCE(
  (SELECT value FROM public.settings WHERE key = 'current_academic_year' LIMIT 1),
  '2025/2026 Ganjil'
)
WHERE academic_year IS NULL;

ALTER TABLE public.assignments
ALTER COLUMN academic_year SET DEFAULT '2025/2026 Ganjil';

ALTER TABLE public.assignments
ALTER COLUMN academic_year SET NOT NULL;

ALTER TABLE public.assignments
DROP CONSTRAINT IF EXISTS assignments_lecturer_course_class_unique;

ALTER TABLE public.assignments
ADD CONSTRAINT assignments_lecturer_course_class_year_unique
UNIQUE (lecturer_id, course_id, class_id, academic_year);
