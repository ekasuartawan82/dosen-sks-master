-- Create enum types for lecturer status and structural positions
CREATE TYPE public.lecturer_status AS ENUM ('Fungsional', 'Non-Fungsional', 'Praktisi');
CREATE TYPE public.structural_position AS ENUM ('Tidak Ada', 'Direktur', 'Wadir', 'Kapus', 'Kanit', 'Kaprodi');

-- Create lecturers table
CREATE TABLE public.lecturers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  status lecturer_status NOT NULL,
  structural_position structural_position NOT NULL DEFAULT 'Tidak Ada',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE public.courses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sks DECIMAL(4,2) NOT NULL CHECK (sks > 0),
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assignments table (many-to-many between lecturers and courses)
CREATE TABLE public.assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lecturer_id UUID NOT NULL REFERENCES public.lecturers(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lecturer_id, course_id)
);

-- Enable Row Level Security
ALTER TABLE public.lecturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;

-- Create policies (for now, allow all operations - can be refined later for auth)
CREATE POLICY "Allow all operations on lecturers" ON public.lecturers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on courses" ON public.courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on assignments" ON public.assignments FOR ALL USING (true) WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_lecturers_updated_at
  BEFORE UPDATE ON public.lecturers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample data
INSERT INTO public.lecturers (name, status, structural_position) VALUES
  ('Dr. Budi Santoso, M.Kom.', 'Fungsional', 'Kaprodi'),
  ('Siti Rahayu, S.Kom., M.T.', 'Fungsional', 'Tidak Ada'),
  ('Ahmad Hidayat, M.Cs.', 'Non-Fungsional', 'Wadir'),
  ('Maya Sari, S.T., M.Kom.', 'Praktisi', 'Tidak Ada');

INSERT INTO public.courses (name, sks, level) VALUES
  ('Dasar Pemrograman', 3.0, 1),
  ('Matematika Diskrit', 2.5, 1),
  ('Struktur Data', 3.0, 2),
  ('Basis Data', 3.0, 2),
  ('Pemrograman Web', 4.0, 2),
  ('Kerja Praktek', 2.0, 3),
  ('Tugas Akhir', 4.0, 3);

-- Insert some sample assignments
INSERT INTO public.assignments (lecturer_id, course_id) 
SELECT l.id, c.id 
FROM public.lecturers l, public.courses c 
WHERE (l.name = 'Dr. Budi Santoso, M.Kom.' AND c.name IN ('Dasar Pemrograman', 'Basis Data'))
   OR (l.name = 'Siti Rahayu, S.Kom., M.T.' AND c.name IN ('Struktur Data', 'Pemrograman Web', 'Tugas Akhir'))
   OR (l.name = 'Ahmad Hidayat, M.Cs.' AND c.name IN ('Matematika Diskrit', 'Basis Data'))
   OR (l.name = 'Maya Sari, S.T., M.Kom.' AND c.name IN ('Kerja Praktek'));