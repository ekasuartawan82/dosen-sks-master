import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getLocalData, saveLocalData } from '@/lib/localData';
import { rethrowInProduction } from '@/lib/dataMode';

const MAX_DAILY_SKS_PER_LECTURER = 4;

export interface Schedule {
    id: string;
    assignment_id: string;
    academic_year: string;
    day_of_week: number;
    time_slot: number;
    has_conflict: boolean;
    created_at: string;
    updated_at: string;
    assignments: {
        courses: {
            id: string;
            name: string;
            sks: number;
            program_id?: string | null;
        };
        lecturers: {
            id: string;
            name: string;
        };
        classes: {
            id: string;
            name: string;
            level?: number;
            program_id?: string;
        };
    };
}

interface StoredSchedule {
    id: string;
    assignment_id: string;
    academic_year: string;
    day_of_week: number;
    time_slot: number;
    has_conflict: boolean;
    created_at: string;
    updated_at: string;
}

interface AssignmentRecord {
    id: string;
    lecturer_id: string;
    course_id: string;
    class_id: string | null;
    created_at?: string;
    lecturers?: { id: string; name: string } | null;
    courses?: { id: string; name: string; sks: number } | null;
    classes?: { id: string; name: string; level?: number; program_id?: string } | null;
}

export interface ConflictCheck {
    conflicted_lecturer_name: string;
    conflicted_class_name: string;
    conflicted_course_name: string;
    conflict_type: 'lecturer' | 'class';
    day_of_week: number;
    time_slot: number;
}

export const TIME_SLOTS = [
    { id: 0, label: "07.45 - 08.35", start: "07:45", end: "08:35" },
    { id: 1, label: "08.35 - 09.25", start: "08:35", end: "09:25" },
    { id: 2, label: "09.25 - 10.15", start: "09:25", end: "10:15" },
    { id: 3, label: "10.15 - 10.30", start: "10:15", end: "10:30", isBreak: true },
    { id: 4, label: "10.30 - 11.20", start: "10:30", end: "11:20" },
    { id: 5, label: "11.20 - 12.10", start: "11:20", end: "12:10" },
    { id: 6, label: "12.10 - 13.10", start: "12:10", end: "13:10", isBreak: true },
    { id: 7, label: "13.10 - 14.00", start: "13:10", end: "14:00" },
    { id: 8, label: "14.00 - 14.50", start: "14:00", end: "14:50" }
];

export const DAYS = [
    { id: 1, label: "Senin" },
    { id: 2, label: "Selasa" },
    { id: 3, label: "Rabu" },
    { id: 4, label: "Kamis" },
    { id: 5, label: "Jumat" }
];

const isTeachingSlot = (slotId: number) => {
    const slot = TIME_SLOTS.find(item => item.id === slotId);
    return !!slot && !slot.isBreak;
};

const getCourseSlotIds = (startSlot: number, sks: number): number[] | null => {
    const slots: number[] = [];
    let currentSlot = startSlot;

    while (slots.length < sks) {
        const slot = TIME_SLOTS.find(item => item.id === currentSlot);
        if (!slot) return null;
        if (!slot.isBreak) slots.push(currentSlot);
        currentSlot++;
    }

    return slots;
};

const schedulesOverlap = (left: Schedule, right: Schedule) => {
    if (left.day_of_week !== right.day_of_week) return false;

    const leftSlots = getCourseSlotIds(left.time_slot, left.assignments.courses.sks) || [];
    const rightSlots = getCourseSlotIds(right.time_slot, right.assignments.courses.sks) || [];
    return leftSlots.some(slot => rightSlots.includes(slot));
};

const hydrateLocalAssignment = (assignmentId: string): AssignmentRecord | null => {
    const assignments = getLocalData<AssignmentRecord>('assignments');
    const courses = getLocalData<{ id: string; name: string; sks: number }>('courses');
    const lecturers = getLocalData<{ id: string; name: string }>('lecturers');
    const classes = getLocalData<{ id: string; name: string; level?: number; program_id?: string }>('classes');

    const assignment = assignments.find(item => item.id === assignmentId);
    if (!assignment) return null;

    return {
        ...assignment,
        lecturers: lecturers.find(item => item.id === assignment.lecturer_id) || {
            id: assignment.lecturer_id,
            name: 'Unknown'
        },
        courses: courses.find(item => item.id === assignment.course_id) || {
            id: assignment.course_id,
            name: 'Unknown',
            sks: 1
        },
        classes: assignment.class_id
            ? classes.find(item => item.id === assignment.class_id) || {
                id: assignment.class_id,
                name: 'Unknown'
            }
            : null
    };
};

const hydrateLocalSchedule = (schedule: StoredSchedule): Schedule | null => {
    const assignment = hydrateLocalAssignment(schedule.assignment_id);
    if (!assignment || !assignment.courses || !assignment.lecturers || !assignment.classes) return null;

    return {
        ...schedule,
        assignments: {
            courses: assignment.courses,
            lecturers: assignment.lecturers,
            classes: assignment.classes
        }
    };
};

const getLocalSchedules = (academicYear?: string, classId?: string, programId?: string): Schedule[] => {
    const storedSchedules = getLocalData<StoredSchedule>('schedules');
    return storedSchedules
        .map(hydrateLocalSchedule)
        .filter((schedule): schedule is Schedule => !!schedule)
        .filter(schedule => !academicYear || schedule.academic_year === academicYear)
        .filter(schedule => !classId || schedule.assignments.classes.id === classId)
        .filter(schedule => !programId || programId === 'all' || (
            schedule.assignments.courses.program_id === programId &&
            schedule.assignments.classes.program_id === programId
        ))
        .sort((a, b) => a.day_of_week - b.day_of_week || a.time_slot - b.time_slot);
};

const makeScheduleFromAssignment = (
    assignment: AssignmentRecord,
    academicYear: string,
    dayOfWeek: number,
    timeSlot: number,
    hasConflict = false,
    id = Math.random().toString(36).substr(2, 9)
): Schedule => ({
    id,
    assignment_id: assignment.id,
    academic_year: academicYear,
    day_of_week: dayOfWeek,
    time_slot: timeSlot,
    has_conflict: hasConflict,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    assignments: {
        courses: assignment.courses || { id: assignment.course_id, name: 'Unknown', sks: 1 },
        lecturers: assignment.lecturers || { id: assignment.lecturer_id, name: 'Unknown' },
        classes: assignment.classes || { id: assignment.class_id || 'unknown', name: 'Unknown' }
    }
});

const collectConflicts = (target: Schedule, schedules: Schedule[], excludeScheduleId?: string): ConflictCheck[] => {
    const conflicts: ConflictCheck[] = [];

    schedules.forEach(schedule => {
        if (schedule.id === excludeScheduleId) return;
        if (!schedulesOverlap(target, schedule)) return;

        const sameLecturer = schedule.assignments.lecturers.id === target.assignments.lecturers.id;
        const sameClass = schedule.assignments.classes.id === target.assignments.classes.id;

        if (sameLecturer) {
            conflicts.push({
                conflicted_lecturer_name: schedule.assignments.lecturers.name,
                conflicted_class_name: schedule.assignments.classes.name,
                conflicted_course_name: schedule.assignments.courses.name,
                conflict_type: 'lecturer',
                day_of_week: schedule.day_of_week,
                time_slot: schedule.time_slot
            });
        }

        if (sameClass) {
            conflicts.push({
                conflicted_lecturer_name: schedule.assignments.lecturers.name,
                conflicted_class_name: schedule.assignments.classes.name,
                conflicted_course_name: schedule.assignments.courses.name,
                conflict_type: 'class',
                day_of_week: schedule.day_of_week,
                time_slot: schedule.time_slot
            });
        }
    });

    return conflicts;
};

const getLecturerDailyLoad = (schedules: Schedule[], lecturerId: string, dayId: number) => {
    return schedules
        .filter(schedule => schedule.day_of_week === dayId)
        .filter(schedule => schedule.assignments.lecturers.id === lecturerId)
        .reduce((sum, schedule) => sum + schedule.assignments.courses.sks, 0);
};

const getClassDailyLoad = (schedules: Schedule[], classId: string, dayId: number) => {
    return schedules
        .filter(schedule => schedule.day_of_week === dayId)
        .filter(schedule => schedule.assignments.classes.id === classId)
        .reduce((sum, schedule) => sum + schedule.assignments.courses.sks, 0);
};

const generateBalancedSchedules = (
    assignments: AssignmentRecord[],
    academicYear: string,
    existingSchedules: Schedule[]
) => {
    const generated: Schedule[] = [];
    const workingSchedules = [...existingSchedules];
    const sortedAssignments = [...assignments].sort((a, b) => {
        const bSks = b.courses?.sks || 1;
        const aSks = a.courses?.sks || 1;
        return bSks - aSks;
    });

    sortedAssignments.forEach(assignment => {
        if (!assignment.courses || !assignment.lecturers || !assignment.classes) return;

        let bestCandidate: { dayId: number; slotId: number; conflicts: ConflictCheck[]; score: number } | null = null;

        DAYS.forEach(day => {
            TIME_SLOTS.filter(slot => !slot.isBreak).forEach(slot => {
                const requiredSlots = getCourseSlotIds(slot.id, assignment.courses?.sks || 1);
                if (!requiredSlots) return;
                if (!requiredSlots.every(isTeachingSlot)) return;

                const candidate = makeScheduleFromAssignment(assignment, academicYear, day.id, slot.id);
                const conflicts = collectConflicts(candidate, workingSchedules);
                const lecturerLoad = getLecturerDailyLoad(workingSchedules, assignment.lecturer_id, day.id);
                const classLoad = getClassDailyLoad(workingSchedules, assignment.classes?.id || '', day.id);
                const exceedsDailyTarget = lecturerLoad + (assignment.courses?.sks || 1) > MAX_DAILY_SKS_PER_LECTURER;

                const score =
                    conflicts.length * 1000 +
                    (exceedsDailyTarget ? 100 : 0) +
                    lecturerLoad * 10 +
                    classLoad * 3 +
                    slot.id;

                if (!bestCandidate || score < bestCandidate.score) {
                    bestCandidate = { dayId: day.id, slotId: slot.id, conflicts, score };
                }
            });
        });

        if (bestCandidate) {
            const schedule = makeScheduleFromAssignment(
                assignment,
                academicYear,
                bestCandidate.dayId,
                bestCandidate.slotId,
                bestCandidate.conflicts.length > 0
            );
            generated.push(schedule);
            workingSchedules.push(schedule);
        }
    });

    return generated;
};

const persistLocalSchedules = (schedules: Schedule[]) => {
    const stored: StoredSchedule[] = schedules.map(schedule => ({
        id: schedule.id,
        assignment_id: schedule.assignment_id,
        academic_year: schedule.academic_year,
        day_of_week: schedule.day_of_week,
        time_slot: schedule.time_slot,
        has_conflict: schedule.has_conflict,
        created_at: schedule.created_at,
        updated_at: schedule.updated_at
    }));
    saveLocalData('schedules', stored);
};

export const useSchedules = (academicYear?: string, classId?: string, programId?: string) => {
    return useQuery({
        queryKey: ['schedules', academicYear, classId, programId],
        queryFn: async (): Promise<Schedule[]> => {
            try {
                let query = supabase
                    .from('schedules')
                    .select(`
            *,
            assignments!inner (
              courses!inner (
                id,
                name,
                sks,
                program_id
              ),
              lecturers (
                id,
                name
              ),
              classes!inner (
                id,
                name,
                level,
                program_id
              )
            )
          `);

                if (academicYear) {
                    query = query.eq('academic_year', academicYear);
                }

                if (classId) {
                    query = query.eq('assignments.class_id', classId);
                }

                if (programId && programId !== 'all') {
                    query = query
                        .eq('assignments.courses.program_id', programId)
                        .eq('assignments.classes.program_id', programId);
                }

                const { data, error } = await query.order('day_of_week').order('time_slot');

                if (error) throw error;
                return ((data || []) as Schedule[])
                    .filter(schedule => !!schedule.assignments)
                    .filter(schedule => !classId || schedule.assignments.classes?.id === classId)
                    .filter(schedule => !programId || programId === 'all' || (
                        schedule.assignments.courses?.program_id === programId &&
                        schedule.assignments.classes?.program_id === programId
                    ));
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage data for schedules');
                return getLocalSchedules(academicYear, classId, programId);
            }
        },
        enabled: !!academicYear
    });
};

export const useCheckScheduleConflicts = () => {
    return useMutation({
        mutationFn: async (params: {
            assignmentId: string;
            dayOfWeek: number;
            timeSlot: number;
            academicYear: string;
            excludeScheduleId?: string;
        }) => {
            try {
                const { data: assignment, error: assignmentError } = await supabase
                    .from('assignments')
                    .select(`
            id,
            lecturer_id,
            course_id,
            class_id,
            lecturers ( id, name ),
            courses ( id, name, sks ),
            classes ( id, name, level, program_id )
          `)
                    .eq('id', params.assignmentId)
                    .single();

                if (assignmentError) throw assignmentError;

                const { data: schedules, error: schedulesError } = await supabase
                    .from('schedules')
                    .select(`
            *,
            assignments (
              courses ( id, name, sks ),
              lecturers ( id, name ),
              classes ( id, name, level, program_id )
            )
          `)
                    .eq('academic_year', params.academicYear);

                if (schedulesError) throw schedulesError;

                const target = makeScheduleFromAssignment(
                    assignment as AssignmentRecord,
                    params.academicYear,
                    params.dayOfWeek,
                    params.timeSlot
                );

                return collectConflicts(target, (schedules || []) as Schedule[], params.excludeScheduleId);
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage conflict check');
                const assignment = hydrateLocalAssignment(params.assignmentId);
                if (!assignment) return [];

                const target = makeScheduleFromAssignment(
                    assignment,
                    params.academicYear,
                    params.dayOfWeek,
                    params.timeSlot
                );

                return collectConflicts(target, getLocalSchedules(params.academicYear), params.excludeScheduleId);
            }
        }
    });
};

export const useCreateSchedule = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (params: {
            assignment_id: string;
            academic_year: string;
            day_of_week: number;
            time_slot: number;
            has_conflict?: boolean;
        }) => {
            try {
                const { data, error } = await supabase
                    .from('schedules')
                    .insert({
                        assignment_id: params.assignment_id,
                        academic_year: params.academic_year,
                        day_of_week: params.day_of_week,
                        time_slot: params.time_slot,
                        has_conflict: params.has_conflict || false
                    })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for create schedule');
                const storedSchedules = getLocalData<StoredSchedule>('schedules');
                const newSchedule: StoredSchedule = {
                    id: Math.random().toString(36).substr(2, 9),
                    assignment_id: params.assignment_id,
                    academic_year: params.academic_year,
                    day_of_week: params.day_of_week,
                    time_slot: params.time_slot,
                    has_conflict: params.has_conflict || false,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };
                saveLocalData('schedules', [...storedSchedules, newSchedule]);
                return hydrateLocalSchedule(newSchedule);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            toast({
                title: "Jadwal berhasil ditambahkan",
                description: "Jadwal mata kuliah telah disimpan",
            });
        },
        onError: (error) => {
            toast({
                title: "Gagal menambahkan jadwal",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useUpdateSchedule = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (params: {
            id: string;
            assignment_id?: string;
            academic_year?: string;
            day_of_week?: number;
            time_slot?: number;
            has_conflict?: boolean;
        }) => {
            try {
                const { data, error } = await supabase
                    .from('schedules')
                    .update({
                        ...(params.assignment_id && { assignment_id: params.assignment_id }),
                        ...(params.academic_year && { academic_year: params.academic_year }),
                        ...(params.day_of_week !== undefined && { day_of_week: params.day_of_week }),
                        ...(params.time_slot !== undefined && { time_slot: params.time_slot }),
                        ...(params.has_conflict !== undefined && { has_conflict: params.has_conflict })
                    })
                    .eq('id', params.id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for update schedule');
                const storedSchedules = getLocalData<StoredSchedule>('schedules');
                const updatedSchedules = storedSchedules.map(schedule =>
                    schedule.id === params.id
                        ? {
                            ...schedule,
                            ...(params.assignment_id && { assignment_id: params.assignment_id }),
                            ...(params.academic_year && { academic_year: params.academic_year }),
                            ...(params.day_of_week !== undefined && { day_of_week: params.day_of_week }),
                            ...(params.time_slot !== undefined && { time_slot: params.time_slot }),
                            ...(params.has_conflict !== undefined && { has_conflict: params.has_conflict }),
                            updated_at: new Date().toISOString()
                        }
                        : schedule
                );
                saveLocalData('schedules', updatedSchedules);
                const updated = updatedSchedules.find(schedule => schedule.id === params.id);
                if (!updated) throw new Error("Schedule not found");
                return hydrateLocalSchedule(updated);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            toast({
                title: "Jadwal berhasil diperbarui",
                description: "Perubahan jadwal telah disimpan",
            });
        },
        onError: (error) => {
            toast({
                title: "Gagal memperbarui jadwal",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useDeleteSchedule = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const { error } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for delete schedule');
                const storedSchedules = getLocalData<StoredSchedule>('schedules');
                saveLocalData('schedules', storedSchedules.filter(schedule => schedule.id !== id));
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            toast({
                title: "Jadwal berhasil dihapus",
                description: "Jadwal mata kuliah telah dihapus dari sistem",
            });
        },
        onError: (error) => {
            toast({
                title: "Gagal menghapus jadwal",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useGenerateAutoSchedule = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (params: {
            classId: string;
            academicYear: string;
            assignmentIds: string[];
        }) => {
            try {
                const { data: assignments, error: assignmentsError } = await supabase
                    .from('assignments')
                    .select(`
            id,
            lecturer_id,
            course_id,
            class_id,
            lecturers ( id, name ),
            courses ( id, name, sks ),
            classes ( id, name, level, program_id )
          `)
                    .in('id', params.assignmentIds);

                if (assignmentsError) throw assignmentsError;

                const { data: schedules, error: schedulesError } = await supabase
                    .from('schedules')
                    .select(`
            *,
            assignments (
              courses ( id, name, sks ),
              lecturers ( id, name ),
              classes ( id, name, level, program_id )
            )
          `)
                    .eq('academic_year', params.academicYear);

                if (schedulesError) throw schedulesError;

                const existingSchedules = ((schedules || []) as Schedule[])
                    .filter(schedule => !params.assignmentIds.includes(schedule.assignment_id));
                const generatedSchedules = generateBalancedSchedules(
                    (assignments || []) as AssignmentRecord[],
                    params.academicYear,
                    existingSchedules
                );

                await supabase
                    .from('schedules')
                    .delete()
                    .eq('academic_year', params.academicYear)
                    .in('assignment_id', params.assignmentIds);

                if (generatedSchedules.length === 0) return [];

                const { data, error } = await supabase
                    .from('schedules')
                    .insert(generatedSchedules.map(schedule => ({
                        assignment_id: schedule.assignment_id,
                        academic_year: schedule.academic_year,
                        day_of_week: schedule.day_of_week,
                        time_slot: schedule.time_slot,
                        has_conflict: schedule.has_conflict
                    })))
                    .select();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for auto generate schedule');
                const hydratedAssignments = params.assignmentIds
                    .map(hydrateLocalAssignment)
                    .filter((assignment): assignment is AssignmentRecord => !!assignment);
                const existingSchedules = getLocalSchedules(params.academicYear)
                    .filter(schedule => !params.assignmentIds.includes(schedule.assignment_id));
                const generatedSchedules = generateBalancedSchedules(
                    hydratedAssignments,
                    params.academicYear,
                    existingSchedules
                );

                persistLocalSchedules([...existingSchedules, ...generatedSchedules]);
                return generatedSchedules;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            toast({
                title: "Jadwal berhasil digenerate",
                description: `Generate menyeimbangkan beban harian dosen maksimal ${MAX_DAILY_SKS_PER_LECTURER} SKS jika slot tersedia`,
            });
        },
        onError: (error) => {
            toast({
                title: "Gagal generate jadwal",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useCheckAllConflicts = () => {
    return useMutation({
        mutationFn: async (params: {
            academicYear: string;
            programId?: string;
            level?: number;
        }) => {
            try {
                const { data, error } = await supabase
                    .from('schedules')
                    .select(`
            *,
            assignments (
              courses ( id, name, sks ),
              lecturers ( id, name ),
              classes ( id, name, level, program_id )
            )
          `)
                    .eq('academic_year', params.academicYear);

                if (error) throw error;
                return processConflicts((data || []) as Schedule[], params);
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for check all conflicts');
                return processConflicts(getLocalSchedules(params.academicYear), params);
            }
        }
    });
};

function processConflicts(data: Schedule[], params: { programId?: string; level?: number }) {
    const conflictMap = new Map<string, {
        lecturer_name: string;
        conflicts: Array<{
            class_name: string;
            course_name: string;
            day: number;
            time_slot: number;
            conflict_type: 'lecturer' | 'class';
        }>;
    }>();

    const filtered = data.filter(schedule => {
        const classInfo = schedule.assignments.classes;
        if (params.programId && classInfo.program_id !== params.programId) return false;
        if (params.level && classInfo.level !== params.level) return false;
        return true;
    });

    filtered.forEach((schedule, index) => {
        filtered.slice(index + 1).forEach(otherSchedule => {
            if (!schedulesOverlap(schedule, otherSchedule)) return;

            const sameLecturer = schedule.assignments.lecturers.id === otherSchedule.assignments.lecturers.id;
            const sameClass = schedule.assignments.classes.id === otherSchedule.assignments.classes.id;
            if (!sameLecturer && !sameClass) return;

            const key = `${schedule.id}-${otherSchedule.id}`;
            conflictMap.set(key, {
                lecturer_name: sameLecturer
                    ? schedule.assignments.lecturers.name
                    : schedule.assignments.classes.name,
                conflicts: [
                    {
                        class_name: schedule.assignments.classes.name,
                        course_name: schedule.assignments.courses.name,
                        day: schedule.day_of_week,
                        time_slot: schedule.time_slot,
                        conflict_type: sameLecturer ? 'lecturer' : 'class'
                    },
                    {
                        class_name: otherSchedule.assignments.classes.name,
                        course_name: otherSchedule.assignments.courses.name,
                        day: otherSchedule.day_of_week,
                        time_slot: otherSchedule.time_slot,
                        conflict_type: sameLecturer ? 'lecturer' : 'class'
                    }
                ]
            });
        });
    });

    return Array.from(conflictMap.values());
}
