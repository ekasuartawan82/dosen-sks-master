import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { mockPrograms } from '@/data/mockData';
import { useToast } from '@/hooks/use-toast';
import { getLocalDataWithInit, saveLocalData, addLocalItem, updateLocalItem, deleteLocalItem } from '@/lib/localData';
import { rethrowInProduction } from '@/lib/dataMode';

export interface Program {
    id: string;
    name: string;
    code: string;
    description?: string;
    created_at: string;
    updated_at: string;
}

// Get programs from localStorage
const getLocalPrograms = (): Program[] => {
    return getLocalDataWithInit<Program>('programs', mockPrograms);
};

export const usePrograms = () => {
    return useQuery({
        queryKey: ['programs'],
        queryFn: async (): Promise<Program[]> => {
            try {
                const { data, error } = await supabase
                    .from('programs')
                    .select('*')
                    .order('name');

                if (error) throw error;
                return data || [];
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage data for programs');
                return getLocalPrograms();
            }
        }
    });
};

export const useCreateProgram = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (program: Omit<Program, 'id' | 'created_at' | 'updated_at'>) => {
            try {
                const { data, error } = await supabase
                    .from('programs')
                    .insert([program])
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for create program');
                return addLocalItem<Program>('programs', program as Program);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['programs'] });
            toast({
                title: "Program Studi berhasil dibuat",
                description: "Data telah tersimpan",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal membuat program studi",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useUpdateProgram = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ id, ...program }: Partial<Program> & { id: string }) => {
            try {
                const { data, error } = await supabase
                    .from('programs')
                    .update(program)
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for update program');
                const updated = updateLocalItem<Program>('programs', id, program);
                if (!updated) throw new Error("Program not found");
                return updated;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['programs'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['lecturers'] });
            toast({
                title: "Program Studi berhasil diperbarui",
                description: "Perubahan telah tersimpan",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal memperbarui program studi",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useDeleteProgram = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (id: string) => {
            try {
                const { error } = await supabase
                    .from('programs')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for delete program');
                deleteLocalItem<Program>('programs', id);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['programs'] });
            queryClient.invalidateQueries({ queryKey: ['courses'] });
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            queryClient.invalidateQueries({ queryKey: ['lecturers'] });
            toast({
                title: "Program Studi berhasil dihapus",
                description: "Data telah dihapus",
            });
        },
        onError: (error: any) => {
            toast({
                title: "Gagal menghapus program studi",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};
