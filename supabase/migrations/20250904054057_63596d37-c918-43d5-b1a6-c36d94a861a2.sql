-- Create programs (prodi) table
CREATE TABLE public.programs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Create policies for programs
CREATE POLICY "Programs are viewable by everyone" 
ON public.programs 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create programs" 
ON public.programs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Authenticated users can update programs" 
ON public.programs 
FOR UPDATE 
USING (true);

CREATE POLICY "Authenticated users can delete programs" 
ON public.programs 
FOR DELETE 
USING (true);

-- Add program_id to courses table
ALTER TABLE public.courses ADD COLUMN program_id UUID REFERENCES public.programs(id);

-- Add program_id to classes table  
ALTER TABLE public.classes ADD COLUMN program_id UUID REFERENCES public.programs(id);

-- Create trigger for programs updated_at
CREATE TRIGGER update_programs_updated_at
BEFORE UPDATE ON public.programs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default programs
INSERT INTO public.programs (name, code, description) VALUES 
('Teknik Informatika', 'TI', 'Program Studi Teknik Informatika'),
('Sistem Informasi', 'SI', 'Program Studi Sistem Informasi'),
('Teknik Komputer', 'TK', 'Program Studi Teknik Komputer');