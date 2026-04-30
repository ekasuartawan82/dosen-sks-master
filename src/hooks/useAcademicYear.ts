import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getLocalData, saveLocalData } from '@/lib/localData';

export interface AcademicYear {
    id: string;
    name: string;
    year_start: number;
    year_end: number;
    semester: 'Ganjil' | 'Genap';
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

interface AcademicYearWithType extends AcademicYear {
    type: string;
}

// Default academic years if none exist
const defaultAcademicYears: AcademicYear[] = [
    {
        id: '1',
        name: '2024/2025 Ganjil',
        year_start: 2024,
        year_end: 2025,
        semester: 'Ganjil',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    }
];

// Get academic years from localStorage
const getLocalAcademicYears = (): AcademicYear[] => {
    const data = getLocalData<AcademicYearWithType>('settings');
    const academicYears = data.filter(item => item.type === 'academic_year');
    
    if (academicYears.length === 0) {
        // Initialize with default
        const withType: AcademicYearWithType[] = defaultAcademicYears.map(ay => ({ ...ay, type: 'academic_year' }));
        const currentSettings = getLocalData<AcademicYearWithType>('settings');
        saveLocalData('settings', [...currentSettings, ...withType]);
        return defaultAcademicYears;
    }
    
    return academicYears;
};

// Get active academic year
export const getActiveAcademicYear = (): AcademicYear | null => {
    const years = getLocalAcademicYears();
    return years.find(y => y.is_active) || years[0] || null;
};

export const useAcademicYears = () => {
    return useQuery({
        queryKey: ['academic_years'],
        queryFn: async (): Promise<AcademicYear[]> => {
            return getLocalAcademicYears();
        }
    });
};

export const useActiveAcademicYear = () => {
    return useQuery({
        queryKey: ['academic_year_active'],
        queryFn: async (): Promise<AcademicYear | null> => {
            return getActiveAcademicYear();
        }
    });
};

export const useCreateAcademicYear = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { year_start: number; year_end: number; semester: 'Ganjil' | 'Genap' }) => {
            const newYear: AcademicYearWithType = {
                id: Math.random().toString(36).substr(2, 9),
                name: `${data.year_start}/${data.year_end} ${data.semester}`,
                year_start: data.year_start,
                year_end: data.year_end,
                semester: data.semester,
                is_active: false,
                type: 'academic_year',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            
            const currentSettings = getLocalData<AcademicYearWithType>('settings');
            saveLocalData('settings', [...currentSettings, newYear]);
            return newYear as AcademicYear;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic_years'] });
            queryClient.invalidateQueries({ queryKey: ['academic_year_active'] });
            toast({
                title: "Tahun ajaran berhasil ditambahkan",
                description: "Data tahun ajaran telah tersimpan",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal menambahkan tahun ajaran",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useSetActiveAcademicYear = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (yearId: string) => {
            const currentSettings = getLocalData<AcademicYearWithType>('settings');
            const updated = currentSettings.map(item => {
                if (item.type === 'academic_year') {
                    return { ...item, is_active: item.id === yearId, updated_at: new Date().toISOString() };
                }
                return item;
            });
            saveLocalData('settings', updated);
            return yearId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic_years'] });
            queryClient.invalidateQueries({ queryKey: ['academic_year_active'] });
            queryClient.invalidateQueries({ queryKey: ['assignments'] });
            queryClient.invalidateQueries({ queryKey: ['schedules'] });
            queryClient.invalidateQueries({ queryKey: ['lecturers'] });
            toast({
                title: "Tahun ajaran aktif diubah",
                description: "Data akan ditampilkan sesuai tahun ajaran yang dipilih",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal mengubah tahun ajaran",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};

export const useDeleteAcademicYear = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (yearId: string) => {
            const currentSettings = getLocalData<AcademicYearWithType>('settings');
            const yearToDelete = currentSettings.find(item => item.id === yearId && item.type === 'academic_year');
            
            if (yearToDelete?.is_active) {
                throw new Error("Tidak dapat menghapus tahun ajaran yang sedang aktif");
            }
            
            const filtered = currentSettings.filter(item => item.id !== yearId);
            saveLocalData('settings', filtered);
            return yearId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['academic_years'] });
            toast({
                title: "Tahun ajaran berhasil dihapus",
                description: "Data tahun ajaran telah dihapus",
            });
        },
        onError: (error: Error) => {
            toast({
                title: "Gagal menghapus tahun ajaran",
                description: error.message,
                variant: "destructive",
            });
        }
    });
};
