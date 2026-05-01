import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { mockClasses } from '@/data/mockData';
import { getLocalDataWithInit, addLocalItem, updateLocalItem, deleteLocalItem } from '@/lib/localData';
import { rethrowInProduction } from '@/lib/dataMode';

export interface Class {
    id: string;
    name: string;
    level: number;
    program_id?: string;
    created_at: string;
    updated_at: string;
}

// Get classes from localStorage
const getLocalClasses = (): Class[] => {
    return getLocalDataWithInit<Class>('classes', mockClasses);
};

export const useClasses = (level?: number, programId?: string) => {
    return useQuery({
        queryKey: ['classes', level, programId],
        queryFn: async (): Promise<Class[]> => {
            try {
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
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage data for classes');
                let filtered = getLocalClasses();
                if (level) filtered = filtered.filter(c => c.level === level);
                if (programId) filtered = filtered.filter(c => c.program_id === programId);
                return filtered;
            }
        }
    });
};

export const useCreateClass = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ name, level, program_id }: { name: string; level: number; program_id?: string }) => {
            try {
                const { data, error } = await supabase
                    .from('classes')
                    .insert({ name, level, program_id })
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for create class');
                return addLocalItem<Class>('classes', { name, level, program_id } as Class);
            }
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
        mutationFn: async ({ id, name, level, program_id }: { id: string; name: string; level?: number; program_id?: string }) => {
            try {
                const { data, error } = await supabase
                    .from('classes')
                    .update({
                        name,
                        ...(level && { level }),
                        ...(program_id && { program_id })
                    })
                    .eq('id', id)
                    .select()
                    .single();

                if (error) throw error;
                return data;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for update class');
                const updated = updateLocalItem<Class>('classes', id, {
                    name,
                    ...(level && { level }),
                    ...(program_id && { program_id })
                });
                if (!updated) throw new Error("Class not found");
                return updated;
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['classes'] });
            toast({
                title: "Kelas berhasil diperbarui",
                description: "Data kelas telah diubah.",
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
            try {
                const { error } = await supabase
                    .from('classes')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
            } catch (error) {
                rethrowInProduction(error);
                console.warn('Using local storage for delete class');
                deleteLocalItem<Class>('classes', id);
            }
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
