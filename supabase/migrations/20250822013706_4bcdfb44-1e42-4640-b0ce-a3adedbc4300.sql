-- Create settings table for configurable application data
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Create policies for settings
CREATE POLICY "Allow all operations on settings" 
ON public.settings 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create schedules table for storing course schedules
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL,
  academic_year TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 1 = Monday, etc.
  time_slot INTEGER NOT NULL CHECK (time_slot >= 0 AND time_slot <= 8), -- Index for predefined time slots
  has_conflict BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(assignment_id, day_of_week, time_slot)
);

-- Enable RLS
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;

-- Create policies for schedules
CREATE POLICY "Allow all operations on schedules" 
ON public.schedules 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add foreign key constraint
ALTER TABLE public.schedules 
ADD CONSTRAINT schedules_assignment_id_fkey 
FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates on settings
CREATE TRIGGER update_settings_updated_at
BEFORE UPDATE ON public.settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for automatic timestamp updates on schedules
CREATE TRIGGER update_schedules_updated_at
BEFORE UPDATE ON public.schedules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings
INSERT INTO public.settings (key, value, description) VALUES
('study_program_name', 'Program Studi', 'Nama program studi untuk header jadwal'),
('academic_official_name', 'Nama Pejabat', 'Nama pejabat untuk tanda tangan jadwal'),
('current_academic_year', '2025/2026 Ganjil', 'Tahun ajaran aktif saat ini');

-- Create function to check schedule conflicts
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