import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Class {
  id: string;
  name: string;
  level: number;
  created_at: string;
  updated_at: string;
}

export const useClasses = (level?: number, programId?: string) => {
  return useQuery({
    queryKey: ['classes', level, programId],
    queryFn: async (): Promise<Class[]> => {
      let query = supabase
        .from('classes')
        .select('*')
        .order('level', { ascending: true })
        .order('name', { ascending: true });
      
      if (level) {
        query = query.eq('level', level);
      }

      if (programId) {
        query = query.eq('program_id', programId);
      }

      const { data: classes, error } = await query;

      if (error) throw error;
      return classes || [];
    }
  });
};

export const useCreateClass = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ name, level }: { name: string; level: number }) => {
      const { data, error } = await supabase
        .from('classes')
        .insert({ name, level })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({
        title: "Kelas berhasil dibuat",
        description: "Kelas baru telah ditambahkan ke sistem.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal membuat kelas baru",
        variant: "destructive",
      });
    }
  });
};

export const useUpdateClass = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { data, error } = await supabase
        .from('classes')
        .update({ name })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      toast({
        title: "Kelas berhasil diperbarui",
        description: "Nama kelas telah diubah.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal memperbarui kelas",
        variant: "destructive",
      });
    }
  });
};

export const useDeleteClass = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      toast({
        title: "Kelas berhasil dihapus",
        description: "Kelas telah dihapus dari sistem.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Gagal menghapus kelas",
        variant: "destructive",
      });
    }
  });
};