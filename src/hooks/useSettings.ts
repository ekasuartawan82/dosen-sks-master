import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Setting {
    id: string;
    key: string;
    value: string;
    description: string | null;
    created_at: string;
    updated_at: string;
}

export const useSettings = () => {
    return useQuery({
        queryKey: ['settings'],
        queryFn: async (): Promise<Setting[]> => {
            const { data, error } = await supabase
                .from('settings')
                .select('*')
                .order('key');

            if (error) throw error;
            return data || [];
        }
    });
};

export const useSetting = (key: string) => {
    return useQuery({
        queryKey: ['settings', key],
        queryFn: async (): Promise<Setting | null> => {
            try {
                const { data, error } = await supabase
                    .from('settings')
                    .select('*')
                    .eq('key', key)
                    .maybeSingle();

                if (error) throw error;
                return data;
            } catch (error) {
                console.warn('Using mock setting for', key);
                if (key === 'current_academic_year') {
                    return {
                        id: 'mock-setting-1',
                        key: 'current_academic_year',
                        value: '2024/2025 Genap',
                        description: 'Tahun ajaran aktif',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                }
                return null;
            }
        }
    });
};

export const useUpdateSetting = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async ({ key, value }: { key: string; value: string }) => {
            const { data, error } = await supabase
                .from('settings')
                .upsert({ key, value }, { onConflict: 'key' })
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['settings'] });
            toast({
                title: "Pengaturan berhasil disimpan",
                description: "Perubahan telah diterapkan",
            });
        },
        onError: (error) => {
            toast({
                title: "Gagal menyimpan pengaturan",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};