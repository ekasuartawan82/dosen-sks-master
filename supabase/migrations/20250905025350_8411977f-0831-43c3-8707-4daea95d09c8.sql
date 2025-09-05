-- Add program_id column to lecturers table
ALTER TABLE public.lecturers 
ADD COLUMN program_id UUID REFERENCES public.programs(id);

-- Create index for better performance
CREATE INDEX idx_lecturers_program_id ON public.lecturers(program_id);