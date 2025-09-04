import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Course {
  id: string;
  name: string;
  sks: number;
  level: number;
  created_at: string;
  updated_at: string;
  assignedLecturers?: Array<{
    id: string;
    name: string | null;
    className?: string;
    classId?: string;
  }>;
}

export const useCourses = (programId?: string) => {
  return useQuery({
    queryKey: ['courses', programId],
    queryFn: async (): Promise<Course[]> => {
      let coursesQuery = supabase
        .from('courses')
        .select(`
          id,
          name,
          sks,
          level,
          program_id,
          created_at,
          updated_at,
          assignments (
            lecturers (
              id,
              name
            ),
            classes (
              id,
              name
            )
          )
        `)
        .order('name');

      // Filter by program if specified
      if (programId && programId !== 'all') {
        coursesQuery = coursesQuery.eq('program_id', programId);
      }

      const { data: courses, error } = await coursesQuery;

      if (error) throw error;

      return courses.map(course => ({
        ...course,
        assignedLecturers: course.assignments.map(assignment => ({
          ...(assignment.lecturers || {}),
          className: assignment.classes?.name,
          classId: assignment.classes?.id,
          // Ensure required fields have defaults if lecturer data is not available
          id: assignment.lecturers?.id || 'unknown',
          name: assignment.lecturers?.name || null
        }))
      }));
    }
  });
};