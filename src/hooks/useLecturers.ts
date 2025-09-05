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

export const useLecturers = (programId?: string) => {
  return useQuery({
    queryKey: ['lecturers', programId],
    queryFn: async (): Promise<LecturerWithWorkload[]> => {
      // Build the query for lecturers with their course assignments
      let lecturerQuery = supabase
        .from('lecturers')
        .select(`
          id,
          name,
          status,
          structural_position,
          program_id,
          assignments (
            course_id,
            class_id,
            courses (
              id,
              name,
              sks,
              program_id
            ),
            classes (
              id,
              name,
              program_id
            )
          )
        `);

      // Filter by program if specified and only show functional lecturers
      if (programId && programId !== 'all') {
        lecturerQuery = lecturerQuery.eq('program_id', programId);
      }
      
      // Only show functional lecturers in the regular lecturers page
      lecturerQuery = lecturerQuery.eq('status', 'Fungsional');

      const { data: lecturers, error } = await lecturerQuery;

      if (error) throw error;

      // Get course assignment counts for team teaching calculation (per class)
      // Only count functional lecturers for team teaching
      let countsQuery = supabase
        .from('assignments')
        .select(`
          course_id, 
          class_id,
          lecturers!inner(status),
          courses!inner(program_id)
        `);

      const { data: courseCounts, error: countsError } = await countsQuery;

      if (countsError) throw countsError;

      // Count how many FUNCTIONAL lecturers are assigned to each course per class
      const courseAssignmentCounts = courseCounts.reduce((acc, assignment) => {
        const key = `${assignment.course_id}-${assignment.class_id || 'no-class'}`;
        // Only count functional lecturers for team teaching calculation
        if (assignment.lecturers.status === 'Fungsional') {
          acc[key] = (acc[key] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // Calculate workload for each lecturer
      return lecturers.map(lecturer => {
        const structuralSKS = getStructuralSKS(lecturer.structural_position);
        
        let teachingSKS = 0;
        const courses = lecturer.assignments
          .filter(assignment => {
            // Filter assignments based on program if specified
            if (!programId || programId === 'all') return true;
            const course = assignment.courses;
            const classInfo = assignment.classes;
            return course?.program_id === programId || classInfo?.program_id === programId;
          })
          .map(assignment => {
            const course = assignment.courses;
            const classInfo = assignment.classes;
            const key = `${course.id}-${assignment.class_id || 'no-class'}`;
            
            let sksShare: number;
            let sharedWith: number;
            
            if (lecturer.status === 'Fungsional') {
              // For functional lecturers, divide SKS among functional lecturers only
              sharedWith = courseAssignmentCounts[key] || 1;
              sksShare = course.sks / sharedWith;
            } else {
              // For non-functional and practitioner lecturers, don't count in team teaching
              // They get 0 SKS if there are functional lecturers teaching the same course
              const functionalCount = courseAssignmentCounts[key] || 0;
              if (functionalCount > 0) {
                sksShare = 0; // Non-functional/practitioner doesn't get SKS if functional lecturer exists
                sharedWith = functionalCount;
              } else {
                sksShare = course.sks; // Only gets full SKS if no functional lecturer
                sharedWith = 1;
              }
            }
            
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