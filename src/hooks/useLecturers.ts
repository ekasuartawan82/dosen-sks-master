import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface LecturerWithWorkload {
  id: string;
  name: string;
  status: "sufficient" | "insufficient" | "excess";
  structuralPosition: string;
  teachingSKS: number;
  structuralSKS: number;
  totalWorkload: number;
  courses: Array<{
    id: string;
    name: string;
    sks: number;
    sharedWith: number; // Number of lecturers teaching this course
    className?: string;
    classId?: string;
  }>;
}

const getStructuralSKS = (position: string): number => {
  switch (position) {
    case 'Direktur': return 5;
    case 'Wadir': return 4;
    case 'Kapus':
    case 'Kanit':
    case 'Kaprodi': return 3;
    default: return 0;
  }
};

export const useLecturers = () => {
  return useQuery({
    queryKey: ['lecturers'],
    queryFn: async (): Promise<LecturerWithWorkload[]> => {
      // Fetch lecturers with their course assignments
      const { data: lecturers, error } = await supabase
        .from('lecturers')
        .select(`
          id,
          name,
          status,
          structural_position,
          assignments (
            course_id,
            class_id,
            courses (
              id,
              name,
              sks
            ),
            classes (
              id,
              name
            )
          )
        `);

      if (error) throw error;

      // Get course assignment counts for team teaching calculation (per class)
      const { data: courseCounts, error: countsError } = await supabase
        .from('assignments')
        .select('course_id, class_id');

      if (countsError) throw countsError;

      // Count how many lecturers are assigned to each course per class
      const courseAssignmentCounts = courseCounts.reduce((acc, assignment) => {
        const key = `${assignment.course_id}-${assignment.class_id || 'no-class'}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calculate workload for each lecturer
      return lecturers.map(lecturer => {
        const structuralSKS = getStructuralSKS(lecturer.structural_position);
        
        let teachingSKS = 0;
        const courses = lecturer.assignments.map(assignment => {
          const course = assignment.courses;
          const classInfo = assignment.classes;
          const key = `${course.id}-${assignment.class_id || 'no-class'}`;
          const sharedWith = courseAssignmentCounts[key] || 1;
          const sksShare = course.sks / sharedWith;
          teachingSKS += sksShare;
          
          return {
            id: course.id,
            name: course.name,
            sks: course.sks,
            sharedWith,
            className: classInfo?.name,
            classId: classInfo?.id
          };
        });

        const totalWorkload = Math.round((teachingSKS + structuralSKS) * 100) / 100;
        
        // Calculate status based on workload
        let status: "sufficient" | "insufficient" | "excess";
        if (totalWorkload < 12) {
          status = "insufficient";
        } else if (totalWorkload === 12) {
          status = "sufficient";
        } else {
          status = "excess";
        }

        return {
          id: lecturer.id,
          name: lecturer.name,
          status,
          structuralPosition: lecturer.structural_position,
          teachingSKS: Math.round(teachingSKS * 100) / 100, // Round to 2 decimal places
          structuralSKS,
          totalWorkload,
          courses
        };
      });
    }
  });
};