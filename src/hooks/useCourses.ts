import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mockCourses, mockAssignments } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { getLocalDataWithInit, getLocalData, addLocalItem, updateLocalItem, deleteLocalItem } from '@/lib/localData';
import { rethrowInProduction } from '@/lib/dataMode';

export interface Course {
    id: string;
    name: string;
    sks: number;
    level: number;
    semester: number;
    program_id: string;
    created_at: string;
    updated_at: string;
    assignedLecturers?: Array<{
        id: string;
        name: string | null;
        className?: string;
        classId?: string;
        academicYear?: string;
    }>;
}

// Get courses from localStorage
const getLocalCourses = (): Course[] => {
    return getLocalDataWithInit<Course>('courses', mockCourses as Course[]);
};

const matchesAcademicYear = (assignment: { academic_year?: string }, academicYear?: string) => {
    return !academicYear || !assignment.academic_year || assignment.academic_year === academicYear;
};

export const useCourses = (programId?: string, level?: string, classId?: string, academicYear?: string) => {
    return useQuery({
        queryKey: ['courses', programId, level, classId, academicYear],
        queryFn: async (): Promise<Course[]> => {
            try {
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
              academic_year,
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

                // Filter by level if specified
                if (level && level !== 'all') {
                    coursesQuery = coursesQuery.eq('level', parseInt(level));
                }

                const { data: courses, error } = await coursesQuery;

                if (error) throw error;

                let filteredCourses = courses.map(course => ({
                    ...course,
                    assignedLecturers: course.assignments.map(assignment => ({
                        ...(assignment.lecturers || {}),
                        className: assignment.classes?.name,
                        classId: assignment.classes?.id,
                        academicYear: assignment.academic_year,
                        // Ensure required fields have defaults if lecturer data is not available
                        id: assignment.lecturers?.id || 'unknown',
                        name: assignment.lecturers?.name || null
                    })).filter(assignment => matchesAcademicYear({ academic_year: assignment.academicYear }, academicYear))
                }));

                // Filter by class if specified (needs to be done after data mapping)
                if (classId && classId !== 'all') {
                    filteredCourses = filteredCourses.filter(course =>
                        course.assignedLecturers.some(lecturer => lecturer.classId === classId)
                    );
                }

                return filteredCourses;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage data for courses');

                let filtered = getLocalCourses();
                if (programId && programId !== 'all') filtered = filtered.filter(c => c.program_id === programId);
                if (level && level !== 'all') filtered = filtered.filter(c => c.level === parseInt(level));

                const localAssignments = getLocalData<(typeof mockAssignments[0]) & { academic_year?: string }>('assignments')
                    .filter(a => matchesAcademicYear(a, academicYear));
                const localLecturers = getLocalData<{ id: string; name: string }>('lecturers');
                const localClasses = getLocalData<{ id: string; name: string }>('classes');

                return filtered.map(course => {
                    const courseAssignments = localAssignments.filter(a => a.course_id === course.id);
                    return {
                        ...course,
                        assignedLecturers: courseAssignments.map(a => {
                            const lecturer = localLecturers.find(l => l.id === a.lecturer_id);
                            const classInfo = localClasses.find(c => c.id === a.class_id);
                            return {
                                id: lecturer?.id || 'unknown',
                                name: lecturer?.name || null,
                                className: classInfo?.name,
                                classId: classInfo?.id,
                                academicYear: a.academic_year
                            };
                        })
                    };
                });
            }
        }
    });
};

export const useCreateCourse = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (course: any) => {
            try {
                const { data, error } = await supabase
                    .from('courses')
                    .insert([course])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for create course');
                return addLocalItem<Course>('courses', course as Course);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            toast({
                title: "Mata Kuliah berhasil ditambahkan",
                description: "Data mata kuliah telah tersimpan",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal menambahkan mata kuliah",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useUpdateCourse = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...course }: { id: string } & Partial<Course>) => {
            try {
                const { data, error } = await supabase
                    .from('courses')
                    .update(course)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for update course');
                const updated = updateLocalItem<Course>('courses', id, course);
                if (!updated) throw new Error("Course not found");
                return updated;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            toast({
                title: "Mata Kuliah berhasil diperbarui",
                description: "Data mata kuliah telah tersimpan",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal memperbarui mata kuliah",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useDeleteCourse = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const { error } = await supabase
                    .from('courses')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for delete course');
                deleteLocalItem<Course>('courses', id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            toast({
                title: "Mata Kuliah berhasil dihapus",
                description: "Data mata kuliah telah dihapus",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal menghapus mata kuliah",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};
