import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mockLecturers } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { getLocalDataWithInit, getLocalData, addLocalItem, updateLocalItem, deleteLocalItem } from '@/lib/localData';
import { rethrowInProduction } from '@/lib/dataMode';

export interface Lecturer {
    id: string;
    name: string;
    status: string;
    structural_position: string;
    program_id?: string;
    created_at: string;
    updated_at: string;
}

export interface LecturerWithWorkload {
    id: string;
    name: string;
    status: "sufficient" | "insufficient" | "excess";
    structuralPosition: string;
    programId?: string;
    teachingSKS: number;
    structuralSKS: number;
    totalWorkload: number;
    courses: Array<{
        id: string;
        name: string;
        sks: number;
        sharedWith: number;
        className?: string;
        classId?: string;
    }>;
}

// Get lecturers from localStorage
const getLocalLecturers = (): Lecturer[] => {
    return getLocalDataWithInit<Lecturer>('lecturers', mockLecturers as Lecturer[]);
};

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

// Check if course is PKL (excluded from SKS limit)
const isPKLCourse = (courseName: string): boolean => {
    const name = courseName.toLowerCase();
    return name.includes('pkl') || 
           name.includes('praktek kerja lapangan') || 
           name.includes('praktik kerja lapangan') ||
           name.includes('magang');
};

const matchesAcademicYear = (assignment: { academic_year?: string }, academicYear?: string) => {
    return !academicYear || !assignment.academic_year || assignment.academic_year === academicYear;
};

export const useLecturers = (programId?: string, includeTeachingStaff: boolean = false, academicYear?: string) => {
    return useQuery({
        queryKey: ['lecturers', programId, includeTeachingStaff, academicYear],
        queryFn: async (): Promise<LecturerWithWorkload[]> => {
            try {
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
              academic_year,
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

                // Filter by program if specified 
                if (programId && programId !== 'all') {
                    lecturerQuery = lecturerQuery.eq('program_id', programId);
                }

                // Filter by lecturer type - if includeTeachingStaff is true, include all lecturers
                // Otherwise, only show functional lecturers from programs
                if (!includeTeachingStaff) {
                    lecturerQuery = lecturerQuery.eq('status', 'Fungsional');
                }

                const { data: lecturers, error } = await lecturerQuery;

                if (error) throw error;

                // Get course assignment counts for team teaching calculation (per class)
                // Only count functional lecturers for team teaching
                const countsQuery = supabase
                    .from('assignments')
                    .select(`
            academic_year,
            course_id, 
            class_id,
            lecturers!inner(status),
            courses!inner(program_id)
          `);

                const { data: courseCounts, error: countsError } = await countsQuery;

                if (countsError) throw countsError;

                // Count how many FUNCTIONAL lecturers are assigned to each course per class
                const courseAssignmentCounts = courseCounts.reduce((acc, assignment) => {
                    if (!matchesAcademicYear(assignment, academicYear)) return acc;
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
                            if (!matchesAcademicYear(assignment, academicYear)) return false;
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

                    // Calculate SKS excluding PKL for status calculation
                    const nonPKLTeachingSKS = courses
                        .filter(c => !isPKLCourse(c.name))
                        .reduce((sum, c) => sum + (c.sks / c.sharedWith), 0);
                    const workloadForStatus = Math.round((nonPKLTeachingSKS + structuralSKS) * 100) / 100;

                    // Calculate status based on workload (excluding PKL)
                    let status: "sufficient" | "insufficient" | "excess";
                    if (workloadForStatus < 12) {
                        status = "insufficient";
                    } else if (workloadForStatus <= 16) {
                        status = "sufficient";
                    } else {
                        status = "excess";
                    }

                    return {
                        id: lecturer.id,
                        name: lecturer.name,
                        status,
                        structuralPosition: lecturer.structural_position,
                        programId: lecturer.program_id,
                        teachingSKS: Math.round(teachingSKS * 100) / 100,
                        structuralSKS,
                        totalWorkload,
                        courses
                    };
                });
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage data for lecturers');

                let filteredLecturers = getLocalLecturers();
                if (programId && programId !== 'all') {
                    filteredLecturers = filteredLecturers.filter(l => l.program_id === programId);
                }
                if (!includeTeachingStaff) {
                    filteredLecturers = filteredLecturers.filter(l => l.status === 'Fungsional');
                }

                const localAssignments = getLocalData<{ lecturer_id: string; course_id: string; class_id?: string; academic_year?: string }>('assignments')
                    .filter(a => matchesAcademicYear(a, academicYear));
                const localCourses = getLocalData<{ id: string; name: string; sks: number; program_id: string }>('courses');
                const localClasses = getLocalData<{ id: string; name: string; program_id?: string }>('classes');

                // Calculate course assignment counts
                const courseAssignmentCounts = localAssignments.reduce((acc, assignment) => {
                    const key = `${assignment.course_id}-${assignment.class_id || 'no-class'}`;
                    const lecturer = filteredLecturers.find(l => l.id === assignment.lecturer_id);
                    if (lecturer?.status === 'Fungsional') {
                        acc[key] = (acc[key] || 0) + 1;
                    }
                    return acc;
                }, {} as Record<string, number>);

                return filteredLecturers.map(lecturer => {
                    const structuralSKS = getStructuralSKS(lecturer.structural_position);
                    let teachingSKS = 0;

                    const lecturerAssignments = localAssignments.filter(a => a.lecturer_id === lecturer.id);

                    const courses = lecturerAssignments
                        .filter(assignment => {
                            if (!programId || programId === 'all') return true;
                            const course = localCourses.find(c => c.id === assignment.course_id);
                            const classInfo = localClasses.find(c => c.id === assignment.class_id);
                            return course?.program_id === programId || classInfo?.program_id === programId;
                        })
                        .map(assignment => {
                            const course = localCourses.find(c => c.id === assignment.course_id);
                            const classInfo = localClasses.find(c => c.id === assignment.class_id);
                            if (!course) return null;
                            
                            const key = `${course.id}-${assignment.class_id || 'no-class'}`;

                            let sksShare: number;
                            let sharedWith: number;

                            if (lecturer.status === 'Fungsional') {
                                sharedWith = courseAssignmentCounts[key] || 1;
                                sksShare = course.sks / sharedWith;
                            } else {
                                const functionalCount = courseAssignmentCounts[key] || 0;
                                if (functionalCount > 0) {
                                    sksShare = 0;
                                    sharedWith = functionalCount;
                                } else {
                                    sksShare = course.sks;
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
                        })
                        .filter((c): c is NonNullable<typeof c> => c !== null);

                    const totalWorkload = Math.round((teachingSKS + structuralSKS) * 100) / 100;

                    // Calculate SKS excluding PKL for status calculation
                    const nonPKLTeachingSKS = courses
                        .filter(c => !isPKLCourse(c.name))
                        .reduce((sum, c) => sum + (c.sks / c.sharedWith), 0);
                    const workloadForStatus = Math.round((nonPKLTeachingSKS + structuralSKS) * 100) / 100;

                    let status: "sufficient" | "insufficient" | "excess";
                    if (workloadForStatus < 12) {
                        status = "insufficient";
                    } else if (workloadForStatus <= 16) {
                        status = "sufficient";
                    } else {
                        status = "excess";
                    }

                    return {
                        id: lecturer.id,
                        name: lecturer.name,
                        status,
                        structuralPosition: lecturer.structural_position,
                        programId: lecturer.program_id,
                        teachingSKS: Math.round(teachingSKS * 100) / 100,
                        structuralSKS,
                        totalWorkload,
                        courses
                    };
                });
            }
        }
    });
};

export const useCreateLecturer = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (lecturer: Omit<Lecturer, 'id' | 'created_at' | 'updated_at'>) => {
            try {
                const { data, error } = await supabase
                    .from('lecturers')
                    .insert([lecturer])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for create lecturer');
                return addLocalItem<Lecturer>('lecturers', lecturer as Lecturer);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lecturers'] });
            toast({
                title: "Dosen berhasil ditambahkan",
                description: "Data dosen telah tersimpan",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal menambahkan dosen",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useUpdateLecturer = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...lecturer }: { id: string } & Partial<Lecturer>) => {
            try {
                const { data, error } = await supabase
                    .from('lecturers')
                    .update(lecturer)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for update lecturer');
                const updated = updateLocalItem<Lecturer>('lecturers', id, lecturer);
                if (!updated) throw new Error("Lecturer not found");
                return updated;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lecturers'] });
            toast({
                title: "Dosen berhasil diperbarui",
                description: "Data dosen telah tersimpan",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal memperbarui dosen",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useDeleteLecturer = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const { error } = await supabase
                    .from('lecturers')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for delete lecturer');
                deleteLocalItem<Lecturer>('lecturers', id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['lecturers'] });
            toast({
                title: "Dosen berhasil dihapus",
                description: "Data dosen telah dihapus",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal menghapus dosen",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};
