import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { getLocalData, saveLocalData } from '@/lib/localData';
import { supabase } from '@/integrations/supabase/client';
import { rethrowInProduction } from '@/lib/dataMode';

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

const ACADEMIC_YEARS_SETTING_KEY = 'academic_years';
const CURRENT_ACADEMIC_YEAR_SETTING_KEY = 'current_academic_year';

const makeId = () => Math.random().toString(36).substr(2, 9);

const makeAcademicYearFromName = (name: string): AcademicYear | null => {
    const match = name.match(/^(\d{4})\/(\d{4})\s+(Ganjil|Genap)$/);
    if (!match) return null;

    return {
        id: `current-${name.replace(/\W+/g, '-').toLowerCase()}`,
        name,
        year_start: Number(match[1]),
        year_end: Number(match[2]),
        semester: match[3] as 'Ganjil' | 'Genap',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
};

const safeParseAcademicYears = (value: string | null | undefined): AcademicYear[] => {
    if (!value) return [];

    try {
        const parsed = JSON.parse(value);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter((item): item is AcademicYear => (
            typeof item?.id === 'string' &&
            typeof item?.name === 'string' &&
            typeof item?.year_start === 'number' &&
            typeof item?.year_end === 'number' &&
            (item?.semester === 'Ganjil' || item?.semester === 'Genap')
        ));
    } catch {
        return [];
    }
};

const normalizeAcademicYears = (years: AcademicYear[], activeName?: string): AcademicYear[] => {
    const yearFromCurrentSetting = activeName ? makeAcademicYearFromName(activeName) : null;
    const source = years.length > 0 ? years : yearFromCurrentSetting ? [yearFromCurrentSetting] : defaultAcademicYears;
    const configuredActiveName = activeName && source.some(year => year.name === activeName)
        ? activeName
        : undefined;
    const selectedName = configuredActiveName || source.find(year => year.is_active)?.name || source[0]?.name;

    return source.map(year => ({
        ...year,
        is_active: year.name === selectedName
    }));
};

const fetchServerAcademicYears = async (): Promise<AcademicYear[]> => {
    const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', [ACADEMIC_YEARS_SETTING_KEY, CURRENT_ACADEMIC_YEAR_SETTING_KEY]);

    if (error) throw error;

    const academicYearsSetting = data?.find(item => item.key === ACADEMIC_YEARS_SETTING_KEY);
    const currentAcademicYearSetting = data?.find(item => item.key === CURRENT_ACADEMIC_YEAR_SETTING_KEY);
    const years = safeParseAcademicYears(academicYearsSetting?.value);

    return normalizeAcademicYears(years, currentAcademicYearSetting?.value);
};

const saveServerAcademicYears = async (years: AcademicYear[]): Promise<AcademicYear[]> => {
    const normalized = normalizeAcademicYears(years);
    const activeYear = normalized.find(year => year.is_active) || normalized[0];

    const { error } = await supabase
        .from('settings')
        .upsert([
            {
                key: ACADEMIC_YEARS_SETTING_KEY,
                value: JSON.stringify(normalized),
                description: 'Daftar tahun ajaran aplikasi'
            },
            {
                key: CURRENT_ACADEMIC_YEAR_SETTING_KEY,
                value: activeYear?.name || '',
                description: 'Tahun ajaran aktif saat ini'
            }
        ], { onConflict: 'key' });

    if (error) throw error;
    return normalized;
};

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
            try {
                return await fetchServerAcademicYears();
            } catch (error) {
                rethrowInProduction(error);
                return getLocalAcademicYears();
            }
        }
    });
};

export const useActiveAcademicYear = () => {
    return useQuery({
        queryKey: ['academic_year_active'],
        queryFn: async (): Promise<AcademicYear | null> => {
            try {
                const years = await fetchServerAcademicYears();
                return years.find(y => y.is_active) || years[0] || null;
            } catch (error) {
                rethrowInProduction(error);
                return getActiveAcademicYear();
            }
        }
    });
};

export const useCreateAcademicYear = () => {
    const queryClient = useQueryClient();
    const { toast } = useToast();

    return useMutation({
        mutationFn: async (data: { year_start: number; year_end: number; semester: 'Ganjil' | 'Genap' }) => {
            const newYear: AcademicYearWithType = {
                id: makeId(),
                name: `${data.year_start}/${data.year_end} ${data.semester}`,
                year_start: data.year_start,
                year_end: data.year_end,
                semester: data.semester,
                is_active: false,
                type: 'academic_year',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            try {
                const years = await fetchServerAcademicYears();
                await saveServerAcademicYears([...years, newYear]);
            } catch (error) {
                rethrowInProduction(error);
                const currentSettings = getLocalData<AcademicYearWithType>('settings');
                saveLocalData('settings', [...currentSettings, newYear]);
            }

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
            try {
                const years = await fetchServerAcademicYears();
                const updated = years.map(item => ({
                    ...item,
                    is_active: item.id === yearId,
                    updated_at: new Date().toISOString()
                }));
                await saveServerAcademicYears(updated);
            } catch (error) {
                rethrowInProduction(error);
                const currentSettings = getLocalData<AcademicYearWithType>('settings');
                const updated = currentSettings.map(item => {
                    if (item.type === 'academic_year') {
                        return { ...item, is_active: item.id === yearId, updated_at: new Date().toISOString() };
                    }
                    return item;
                });
                saveLocalData('settings', updated);
            }

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
            try {
                const years = await fetchServerAcademicYears();
                const yearToDelete = years.find(item => item.id === yearId);

                if (yearToDelete?.is_active) {
                    throw new Error("Tidak dapat menghapus tahun ajaran yang sedang aktif");
                }

                await saveServerAcademicYears(years.filter(item => item.id !== yearId));
            } catch (error) {
                rethrowInProduction(error);
                const currentSettings = getLocalData<AcademicYearWithType>('settings');
                const yearToDelete = currentSettings.find(item => item.id === yearId && item.type === 'academic_year');

                if (yearToDelete?.is_active) {
                    throw new Error("Tidak dapat menghapus tahun ajaran yang sedang aktif");
                }

                const filtered = currentSettings.filter(item => item.id !== yearId);
                saveLocalData('settings', filtered);
            }

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
