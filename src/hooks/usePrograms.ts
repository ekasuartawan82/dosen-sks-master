import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Program {
  id: string;
  name: string;
  code: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export const usePrograms = () => {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async (): Promise<Program[]> => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('name');

      if (error) throw error;
      return data || [];
    }
  });
};

export const useCreateProgram = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (program: Omit<Program, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('programs')
        .insert([program])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    }
  });
};

export const useUpdateProgram = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...program }: Partial<Program> & { id: string }) => {
      const { data, error } = await supabase
        .from('programs')
        .update(program)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
    }
  });
};

export const useDeleteProgram = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      queryClient.invalidateQueries({ queryKey: ['lecturers'] });
    }
  });
};