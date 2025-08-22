import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
    };
    lecturers: {
      id: string;
      name: string;
    };
    classes: {
      id: string;
      name: string;
    };
  };
}

export interface ConflictCheck {
  conflicted_lecturer_name: string;
  conflicted_class_name: string;
  conflicted_course_name: string;
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

export const useSchedules = (academicYear?: string, classId?: string) => {
  return useQuery({
    queryKey: ['schedules', academicYear, classId],
    queryFn: async (): Promise<Schedule[]> => {
      let query = supabase
        .from('schedules')
        .select(`
          *,
          assignments (
            courses (
              id,
              name,
              sks
            ),
            lecturers (
              id,
              name
            ),
            classes (
              id,
              name
            )
          )
        `);

      if (academicYear) {
        query = query.eq('academic_year', academicYear);
      }

      if (classId) {
        query = query.eq('assignments.class_id', classId);
      }

      const { data, error } = await query.order('day_of_week').order('time_slot');

      if (error) throw error;
      return data || [];
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
      excludeScheduleId?: string;
    }) => {
      const { data, error } = await supabase.rpc('check_schedule_conflicts', {
        p_assignment_id: params.assignmentId,
        p_day_of_week: params.dayOfWeek,
        p_time_slot: params.timeSlot,
        p_exclude_schedule_id: params.excludeScheduleId || null
      });

      if (error) throw error;
      return data as ConflictCheck[];
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
      day_of_week?: number;
      time_slot?: number;
      has_conflict?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('schedules')
        .update({
          ...(params.assignment_id && { assignment_id: params.assignment_id }),
          ...(params.day_of_week !== undefined && { day_of_week: params.day_of_week }),
          ...(params.time_slot !== undefined && { time_slot: params.time_slot }),
          ...(params.has_conflict !== undefined && { has_conflict: params.has_conflict })
        })
        .eq('id', params.id)
        .select()
        .single();

      if (error) throw error;
      return data;
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
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', id);

      if (error) throw error;
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