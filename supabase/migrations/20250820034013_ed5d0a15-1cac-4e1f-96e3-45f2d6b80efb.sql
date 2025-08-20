-- Add Classes concept to the lecturer assignment system
-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level INTEGER NOT NULL CHECK (level IN (1, 2, 3)),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, level) -- Prevent duplicate class names within the same level
);

-- Enable Row Level Security on classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create policies for classes
CREATE POLICY "Allow all operations on classes" 
ON public.classes 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Add class_id to assignments table
ALTER TABLE public.assignments 
ADD COLUMN class_id UUID REFERENCES public.classes(id) ON DELETE CASCADE;

-- Create trigger for automatic timestamp updates on classes
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some sample classes for testing
INSERT INTO public.classes (name, level) VALUES 
('Kelas A', 1),
('Kelas B', 1),
('Kelas A', 2),
('Kelas B', 2),
('Kelas Malam', 2),
('Kelas A', 3),
('Kelas B', 3);