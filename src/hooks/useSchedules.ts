import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { getLocalData, saveLocalData } from '@/lib/localData';
import { rethrowInProduction } from '@/lib/dataMode';
import type { Json } from '@/integrations/supabase/types';

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
            is_legacy?: boolean;
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

type ScheduleSnapshotScope = 'class' | 'program';

interface ScheduleScopeParams {
    scope: ScheduleSnapshotScope;
    academicYear: string;
    targetId?: string | null;
}

interface StoredScheduleSnapshot {
    id: string;
    scope: ScheduleSnapshotScope;
    target_id: string | null;
    academic_year: string;
    snapshot_data: StoredSchedule[];
    metadata: Record<string, unknown>;
    created_by?: string | null;
    generated_at: string;
    created_at: string;
}

interface AssignmentRecord {
    id: string;
    lecturer_id: string;
    course_id: string;
    class_id: string | null;
    academic_year?: string;
    created_at?: string;
    lecturers?: { id: string; name: string } | null;
    courses?: { id: string; name: string; sks: number } | null;
    classes?: { id: string; name: string; level?: number; program_id?: string; is_legacy?: boolean } | null;
}

export interface ConflictCheck {
    conflicted_lecturer_name: string;
    conflicted_program_id?: string | null;
    conflicted_class_name: string;
    conflicted_course_name: string;
    conflict_type: 'lecturer' | 'class';
    day_of_week: number;
    time_slot: number;
}

export interface GeneratedScheduleConflict {
    lecturer_name: string;
    program_id?: string | null;
    class_name: string;
    course_name: string;
    day_of_week: number;
    time_slot: number;
    conflict_type: 'lecturer' | 'class';
}

export interface GenerateSchedulePreview {
    generated_count: number;
    conflict_count: number;
    conflicts: GeneratedScheduleConflict[];
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
    const courses = getLocalData<{ id: string; name: string; sks: number; program_id?: string | null }>('courses');
    const lecturers = getLocalData<{ id: string; name: string }>('lecturers');
    const classes = getLocalData<{ id: string; name: string; level?: number; program_id?: string; is_legacy?: boolean }>('classes');

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
                conflicted_program_id: schedule.assignments.classes.program_id || schedule.assignments.courses.program_id,
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
                conflicted_program_id: schedule.assignments.classes.program_id || schedule.assignments.courses.program_id,
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

const toStoredSchedule = (schedule: Schedule | StoredSchedule): StoredSchedule => ({
    id: schedule.id,
    assignment_id: schedule.assignment_id,
    academic_year: schedule.academic_year,
    day_of_week: schedule.day_of_week,
    time_slot: schedule.time_slot,
    has_conflict: schedule.has_conflict,
    created_at: schedule.created_at,
    updated_at: schedule.updated_at
});

const getSnapshotTargetId = (params: ScheduleScopeParams) => params.targetId || null;

const validateScope = (params: ScheduleScopeParams) => {
    if (!params.targetId) {
        throw new Error("Pilih target generate terlebih dahulu");
    }
};

const getLocalSnapshots = (): StoredScheduleSnapshot[] => {
    return getLocalData<StoredScheduleSnapshot>('schedule_snapshots');
};

const saveLocalSnapshot = (snapshot: Omit<StoredScheduleSnapshot, 'id' | 'created_at' | 'generated_at'>) => {
    const now = new Date().toISOString();
    const snapshots = getLocalSnapshots();
    const nextSnapshot: StoredScheduleSnapshot = {
        ...snapshot,
        id: Math.random().toString(36).slice(2),
        generated_at: now,
        created_at: now
    };
    saveLocalData('schedule_snapshots', [...snapshots, nextSnapshot]);
    return nextSnapshot;
};

const getLatestLocalSnapshot = (params: ScheduleScopeParams) => {
    const targetId = getSnapshotTargetId(params);
    return getLocalSnapshots()
        .filter(snapshot => snapshot.scope === params.scope)
        .filter(snapshot => snapshot.academic_year === params.academicYear)
        .filter(snapshot => snapshot.target_id === targetId)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
};

const getScopedLocalAssignments = (params: ScheduleScopeParams): AssignmentRecord[] => {
    validateScope(params);

    const assignments = getLocalData<AssignmentRecord>('assignments')
        .map(assignment => hydrateLocalAssignment(assignment.id))
        .filter((assignment): assignment is AssignmentRecord => !!assignment)
        .filter(assignment => assignment.academic_year === params.academicYear)
        .filter(assignment => assignment.class_id)
        .filter(assignment => !assignment.classes?.is_legacy)
        .filter(assignment => !!assignment.courses?.program_id && assignment.courses.program_id === assignment.classes?.program_id);

    if (params.scope === 'class') {
        return assignments.filter(assignment => assignment.class_id === params.targetId);
    }

    if (params.scope === 'program') {
        return assignments.filter(assignment =>
            assignment.courses?.program_id === params.targetId &&
            assignment.classes?.program_id === params.targetId
        );
    }

    throw new Error("Scope generate tidak didukung. Pilih prodi atau kelas.");
};

const fetchScopedAssignments = async (params: ScheduleScopeParams): Promise<AssignmentRecord[]> => {
    validateScope(params);

    let query = supabase
        .from('assignments')
        .select(`
            id,
            lecturer_id,
            course_id,
            class_id,
            academic_year,
            lecturers ( id, name ),
            courses!inner ( id, name, sks, program_id ),
            classes!inner ( id, name, level, program_id, is_legacy )
          `)
        .eq('academic_year', params.academicYear)
        .not('class_id', 'is', null)
        .eq('classes.is_legacy', false);

    if (params.scope === 'class') {
        query = query.eq('class_id', params.targetId);
    }

    if (params.scope === 'program') {
        query = query
            .eq('courses.program_id', params.targetId)
            .eq('classes.program_id', params.targetId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return ((data || []) as AssignmentRecord[])
        .filter(assignment => !!assignment.class_id)
        .filter(assignment => !!assignment.courses?.program_id)
        .filter(assignment => assignment.courses?.program_id === assignment.classes?.program_id);
};

const fetchSchedulesForYear = async (academicYear: string): Promise<Schedule[]> => {
    const { data, error } = await supabase
        .from('schedules')
        .select(`
            *,
            assignments (
              courses ( id, name, sks, program_id ),
              lecturers ( id, name ),
              classes ( id, name, level, program_id, is_legacy )
            )
          `)
        .eq('academic_year', academicYear);

    if (error) throw error;
    return ((data || []) as Schedule[])
        .filter(schedule => !!schedule.assignments?.classes)
        .filter(schedule => !schedule.assignments.classes.is_legacy);
};

const getGeneratePlan = async (params: ScheduleScopeParams) => {
    const assignments = await fetchScopedAssignments(params);
    const assignmentIds = assignments.map(assignment => assignment.id);

    if (assignmentIds.length === 0) {
        throw new Error("Tidak ada assignment aktif yang valid untuk scope generate ini");
    }

    const schedules = await fetchSchedulesForYear(params.academicYear);
    const scopedSchedules = schedules.filter(schedule => assignmentIds.includes(schedule.assignment_id));
    const existingSchedules = schedules.filter(schedule => !assignmentIds.includes(schedule.assignment_id));
    const generatedSchedules = generateBalancedSchedules(assignments, params.academicYear, existingSchedules);

    return { assignments, assignmentIds, schedules, scopedSchedules, existingSchedules, generatedSchedules };
};

const getLocalGeneratePlan = (params: ScheduleScopeParams) => {
    const assignments = getScopedLocalAssignments(params);
    const assignmentIds = assignments.map(assignment => assignment.id);

    if (assignmentIds.length === 0) {
        throw new Error("Tidak ada assignment aktif yang valid untuk scope generate ini");
    }

    const yearSchedules = getLocalSchedules(params.academicYear)
        .filter(schedule => !schedule.assignments.classes.is_legacy);
    const scopedSchedules = yearSchedules.filter(schedule => assignmentIds.includes(schedule.assignment_id));
    const existingSchedules = yearSchedules.filter(schedule => !assignmentIds.includes(schedule.assignment_id));
    const generatedSchedules = generateBalancedSchedules(assignments, params.academicYear, existingSchedules);

    return { assignments, assignmentIds, schedules: yearSchedules, scopedSchedules, existingSchedules, generatedSchedules };
};

const getGeneratedScheduleConflicts = (generatedSchedules: Schedule[], existingSchedules: Schedule[]): GeneratedScheduleConflict[] => {
    const allSchedules = [...existingSchedules, ...generatedSchedules];
    const seen = new Set<string>();

    return generatedSchedules.flatMap(schedule => {
        const conflicts = collectConflicts(schedule, allSchedules, schedule.id);
        return conflicts.map(conflict => {
            const key = `${schedule.assignment_id}-${conflict.conflict_type}-${conflict.day_of_week}-${conflict.time_slot}-${conflict.conflicted_course_name}`;
            if (seen.has(key)) return null;
            seen.add(key);

            return {
                lecturer_name: schedule.assignments.lecturers.name,
                program_id: schedule.assignments.classes.program_id || schedule.assignments.courses.program_id,
                class_name: schedule.assignments.classes.name,
                course_name: schedule.assignments.courses.name,
                day_of_week: schedule.day_of_week,
                time_slot: schedule.time_slot,
                conflict_type: conflict.conflict_type
            };
        });
    }).filter((conflict): conflict is GeneratedScheduleConflict => !!conflict);
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
                program_id,
                is_legacy
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
                    .filter(schedule => !schedule.assignments.classes?.is_legacy)
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
            courses ( id, name, sks, program_id ),
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
              courses ( id, name, sks, program_id ),
              lecturers ( id, name ),
              classes ( id, name, level, program_id, is_legacy )
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

                const activeSchedules = ((schedules || []) as Schedule[])
                    .filter(schedule => !schedule.assignments.classes?.is_legacy);
                return collectConflicts(target, activeSchedules, params.excludeScheduleId);
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
        mutationFn: async (params: ScheduleScopeParams) => {
            try {
                const { assignmentIds, scopedSchedules, existingSchedules, generatedSchedules } = await getGeneratePlan(params);

                const { data: userResult } = await supabase.auth.getUser();
                const { error: snapshotError } = await supabase
                    .from('schedule_snapshots')
                    .insert({
                        scope: params.scope,
                        target_id: getSnapshotTargetId(params),
                        academic_year: params.academicYear,
                        snapshot_data: scopedSchedules.map(toStoredSchedule) as unknown as Json,
                        metadata: {
                            version: 1,
                            record_count: scopedSchedules.length,
                            schedule_count: scopedSchedules.length,
                            assignment_count: assignmentIds.length,
                            academic_year: params.academicYear,
                            operation: 'generate',
                            operator_id: userResult.user?.id || null
                        } as Json,
                        created_by: userResult.user?.id || null
                    });

                if (snapshotError) throw snapshotError;

                const { error: deleteError } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('academic_year', params.academicYear)
                    .in('assignment_id', assignmentIds);

                if (deleteError) throw deleteError;

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
                const { assignmentIds, scopedSchedules, existingSchedules, generatedSchedules } = getLocalGeneratePlan(params);
                saveLocalSnapshot({
                    scope: params.scope,
                    target_id: getSnapshotTargetId(params),
                    academic_year: params.academicYear,
                    snapshot_data: scopedSchedules.map(toStoredSchedule),
                    metadata: {
                        version: 1,
                        record_count: scopedSchedules.length,
                        schedule_count: scopedSchedules.length,
                        assignment_count: assignmentIds.length,
                        academic_year: params.academicYear,
                        operation: 'generate'
                    }
                });
                persistLocalSchedules([...existingSchedules, ...generatedSchedules]);
                return generatedSchedules;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            queryClient.invalidateQueries({ queryKey: ['schedule_snapshots'] });
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

export const usePreviewGenerateAutoSchedule = () => {
    return useMutation({
        mutationFn: async (params: ScheduleScopeParams): Promise<GenerateSchedulePreview> => {
            try {
                const { generatedSchedules, existingSchedules } = await getGeneratePlan(params);
                const conflicts = getGeneratedScheduleConflicts(generatedSchedules, existingSchedules);

                return {
                    generated_count: generatedSchedules.length,
                    conflict_count: conflicts.length,
                    conflicts
                };
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for auto generate preview');
                const { generatedSchedules, existingSchedules } = getLocalGeneratePlan(params);
                const conflicts = getGeneratedScheduleConflicts(generatedSchedules, existingSchedules);

                return {
                    generated_count: generatedSchedules.length,
                    conflict_count: conflicts.length,
                    conflicts
                };
            }
        }
    });
};

export const useRestoreLatestScheduleSnapshot = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (params: ScheduleScopeParams) => {
            try {
                const assignments = await fetchScopedAssignments(params);
                const assignmentIds = assignments.map(assignment => assignment.id);

                if (assignmentIds.length === 0) {
                    throw new Error("Tidak ada assignment aktif yang valid untuk scope restore ini");
                }

                const expectedTargetId = getSnapshotTargetId(params);
                let snapshotQuery = supabase
                    .from('schedule_snapshots')
                    .select('*')
                    .eq('scope', params.scope)
                    .eq('academic_year', params.academicYear);

                snapshotQuery = expectedTargetId
                    ? snapshotQuery.eq('target_id', expectedTargetId)
                    : snapshotQuery.is('target_id', null);

                const { data: snapshot, error: snapshotError } = await snapshotQuery
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (snapshotError) throw snapshotError;
                if (!snapshot) throw new Error("Snapshot jadwal untuk scope ini belum tersedia");

                const snapshotSchedules = Array.isArray(snapshot.snapshot_data)
                    ? (snapshot.snapshot_data as unknown as StoredSchedule[])
                    : [];
                const skippedSnapshotSchedules = snapshotSchedules.filter(schedule => !assignmentIds.includes(schedule.assignment_id));

                if (skippedSnapshotSchedules.length > 0) {
                    console.warn(
                        `Skipping ${skippedSnapshotSchedules.length} snapshot schedules whose assignment_id is no longer active in the selected scope.`,
                        skippedSnapshotSchedules.map(schedule => schedule.assignment_id)
                    );
                }

                const { error: deleteError } = await supabase
                    .from('schedules')
                    .delete()
                    .eq('academic_year', params.academicYear)
                    .in('assignment_id', assignmentIds);

                if (deleteError) throw deleteError;

                if (snapshotSchedules.length === 0) return [];

                const schedulesToRestore = snapshotSchedules
                    .filter(schedule => assignmentIds.includes(schedule.assignment_id))
                    .map(schedule => ({
                        assignment_id: schedule.assignment_id,
                        academic_year: schedule.academic_year,
                        day_of_week: schedule.day_of_week,
                        time_slot: schedule.time_slot,
                        has_conflict: schedule.has_conflict
                    }));

                if (schedulesToRestore.length === 0) return [];

                const { data, error } = await supabase
                    .from('schedules')
                    .insert(schedulesToRestore)
                    .select();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for schedule restore');
                const snapshot = getLatestLocalSnapshot(params);
                if (!snapshot) throw new Error("Snapshot jadwal untuk scope ini belum tersedia");

                const assignments = getScopedLocalAssignments(params);
                const assignmentIds = assignments.map(assignment => assignment.id);
                const skippedSnapshotSchedules = snapshot.snapshot_data.filter(schedule => !assignmentIds.includes(schedule.assignment_id));

                if (skippedSnapshotSchedules.length > 0) {
                    console.warn(
                        `Skipping ${skippedSnapshotSchedules.length} local snapshot schedules whose assignment_id is no longer active in the selected scope.`,
                        skippedSnapshotSchedules.map(schedule => schedule.assignment_id)
                    );
                }

                const existingSchedules = getLocalSchedules(params.academicYear)
                    .filter(schedule => !assignmentIds.includes(schedule.assignment_id));
                const restoredSchedules = snapshot.snapshot_data
                    .filter(schedule => assignmentIds.includes(schedule.assignment_id))
                    .map(schedule => hydrateLocalSchedule(schedule))
                    .filter((schedule): schedule is Schedule => !!schedule);

                persistLocalSchedules([...existingSchedules, ...restoredSchedules]);
                return restoredSchedules;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            toast({
                title: "Snapshot jadwal berhasil direstore",
                description: "Jadwal dalam scope terpilih sudah dikembalikan dari snapshot terakhir",
            });
        },
        onError: (error) => {
            toast({
                title: "Gagal restore jadwal",
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
              classes ( id, name, level, program_id, is_legacy )
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
            program_id?: string | null;
            class_name: string;
            course_name: string;
            day: number;
            time_slot: number;
            conflict_type: 'lecturer' | 'class';
        }>;
    }>();

    const filtered = data.filter(schedule => {
        const classInfo = schedule.assignments.classes;
        if (classInfo.is_legacy) return false;
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
                        program_id: schedule.assignments.classes.program_id || schedule.assignments.courses.program_id,
                        class_name: schedule.assignments.classes.name,
                        course_name: schedule.assignments.courses.name,
                        day: schedule.day_of_week,
                        time_slot: schedule.time_slot,
                        conflict_type: sameLecturer ? 'lecturer' : 'class'
                    },
                    {
                        program_id: otherSchedule.assignments.classes.program_id || otherSchedule.assignments.courses.program_id,
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
