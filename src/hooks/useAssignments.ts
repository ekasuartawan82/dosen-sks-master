import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mockAssignments } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { getLocalDataWithInit, getLocalData, addLocalItem, saveLocalData } from '@/lib/localData';
import { rethrowInProduction } from '@/lib/dataMode';

interface AssignmentRaw {
    id: string;
    lecturer_id: string;
    course_id: string;
    class_id: string | null;
    academic_year?: string;
    created_at: string;
}

export interface Assignment {
    id: string;
    lecturer_id: string;
    course_id: string;
    class_id: string | null;
    academic_year?: string;
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

// Get assignments from localStorage
const getLocalAssignments = (): AssignmentRaw[] => {
    const rawMock = mockAssignments.map(a => ({
        id: a.id,
        lecturer_id: a.lecturer_id,
        course_id: a.course_id,
        class_id: a.class_id,
        academic_year: a.academic_year || '2024/2025 Genap',
        created_at: a.created_at
    }));
    return getLocalDataWithInit<AssignmentRaw>('assignments', rawMock);
};

const matchesAcademicYear = (assignment: { academic_year?: string }, academicYear?: string) => {
    return !academicYear || !assignment.academic_year || assignment.academic_year === academicYear;
};

export const useAssignments = (classId?: string, academicYear?: string) => {
    return useQuery({
        queryKey: ['assignments', classId, academicYear],
        queryFn: async (): Promise<Assignment[]> => {
            try {
                let query = supabase
                    .from('assignments')
                    .select(`
            id,
            lecturer_id,
            course_id,
            class_id,
            academic_year,
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

                if (academicYear) {
                    query = query.eq('academic_year', academicYear);
                }

                const { data, error } = await query.order('created_at');

                if (error) throw error;
                return data || [];
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage data for assignments');
                const rawAssignments = getLocalAssignments();
                const localLecturers = getLocalData<{ id: string; name: string }>('lecturers');
                const localCourses = getLocalData<{ id: string; name: string; sks: number }>('courses');
                const localClasses = getLocalData<{ id: string; name: string }>('classes');

                let filtered = rawAssignments;
                if (classId) {
                    filtered = filtered.filter(a => a.class_id === classId);
                }
                filtered = filtered.filter(a => matchesAcademicYear(a, academicYear));

                return filtered.map(a => ({
                    ...a,
                    lecturers: localLecturers.find(l => l.id === a.lecturer_id) || { id: a.lecturer_id, name: 'Unknown' },
                    courses: localCourses.find(c => c.id === a.course_id) || { id: a.course_id, name: 'Unknown', sks: 0 },
                    classes: a.class_id ? localClasses.find(c => c.id === a.class_id) || null : null
                }));
            }
        }
    });
};

export const useCreateAssignment = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (assignments: Array<{ lecturer_id: string; course_id: string; class_id?: string | null; academic_year?: string }>) => {
            try {
                const { data, error } = await supabase
                    .from('assignments')
                    .insert(assignments)
                    .select();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for create assignment');
                const results = assignments.map(a => 
                    addLocalItem<AssignmentRaw>('assignments', {
                        ...a,
                        class_id: a.class_id || null
                    } as AssignmentRaw)
                );
                return results;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['lecturers'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
        },
        onError: (error: Error) => {
            throw error;
        }
    });
};

export const useDeleteAssignment = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (params: { courseId: string; lecturerId: string; classId?: string; academicYear?: string }) => {
            try {
                let query = supabase
                    .from('assignments')
                    .delete()
                    .eq('course_id', params.courseId)
                    .eq('lecturer_id', params.lecturerId);

                if (params.classId) {
                    query = query.eq('class_id', params.classId);
                } else {
                    query = query.is('class_id', null);
                }

                if (params.academicYear) {
                    query = query.eq('academic_year', params.academicYear);
                }

                const { error } = await query;

                if (error) throw error;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for delete assignment');
                const assignments = getLocalAssignments();
                const filtered = assignments.filter(a => {
                    const matchesCourse = a.course_id === params.courseId;
                    const matchesLecturer = a.lecturer_id === params.lecturerId;
                    const matchesClass = params.classId
                        ? a.class_id === params.classId
                        : a.class_id === null;

                    const matchesYear = matchesAcademicYear(a, params.academicYear);

                    return !(matchesCourse && matchesLecturer && matchesClass && matchesYear);
                });
                
                saveLocalData('assignments', filtered);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['lecturers'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            toast({
                title: "Penugasan dihapus",
                description: "Penugasan dosen telah dihapus",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal menghapus penugasan",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};
