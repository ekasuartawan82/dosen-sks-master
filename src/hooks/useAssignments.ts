import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Assignment {
  id: string;
  lecturer_id: string;
  course_id: string;
  class_id: string | null;
  created_at: string;
  lecturers: {
    id: string;
    name: string;
  };
  courses: {
    id: string;
    name: string;
    sks: number;
  };
  classes: {
    id: string;
    name: string;
  } | null;
}

export const useAssignments = (classId?: string) => {
  return useQuery({
    queryKey: ['assignments', classId],
    queryFn: async (): Promise<Assignment[]> => {
      let query = supabase
        .from('assignments')
        .select(`
          id,
          lecturer_id,
          course_id,
          class_id,
          created_at,
          lecturers (
            id,
            name
          ),
          courses (
            id,
            name,
            sks
          ),
          classes (
            id,
            name
          )
        `);

      if (classId) {
        query = query.eq('class_id', classId);
      }

      const { data, error } = await query.order('created_at');

      if (error) throw error;
      return data || [];
    }
  });
};