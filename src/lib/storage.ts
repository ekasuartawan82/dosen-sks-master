// Local Storage Manager for Multi-User Support
// This allows each user to have their own data stored locally

export interface UserData {
    programs: any[];
    classes: any[];
    lecturers: any[];
    courses: any[];
    assignments: any[];
    schedules: any[];
    settings: any[];
}

export interface ExportData {
    version: string;
    exportedAt: string;
    userId: string;
    profile: { id: string; name: string; email: string } | null;
    data: UserData;
    checksum?: string;
}

const STORAGE_PREFIX = 'dosen_sks_';
const EXPORT_VERSION = '1.0';
const MAX_IMPORT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_RECORDS_PER_TYPE = 10000;
const MAX_STRING_LENGTH = 5000;
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const DATA_TYPES: (keyof UserData)[] = [
    'programs',
    'classes',
    'lecturers',
    'courses',
    'assignments',
    'schedules',
    'settings'
];

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};

const sanitizeValue = (value: unknown, depth = 0): unknown => {
    if (depth > 8) {
        throw new Error('Struktur file terlalu dalam');
    }

    if (value === null || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    if (typeof value === 'string') {
        return value.slice(0, MAX_STRING_LENGTH);
    }

    if (Array.isArray(value)) {
        if (value.length > MAX_RECORDS_PER_TYPE) {
            throw new Error('Jumlah data dalam file terlalu besar');
        }
        return value.map(item => sanitizeValue(item, depth + 1));
    }

    if (isPlainObject(value)) {
        const clean: Record<string, unknown> = {};
        Object.entries(value).forEach(([key, item]) => {
            if (DANGEROUS_KEYS.has(key)) {
                throw new Error('File backup mengandung key berbahaya');
            }
            clean[key] = sanitizeValue(item, depth + 1);
        });
        return clean;
    }

    throw new Error('File backup mengandung nilai yang tidak didukung');
};

const safeJsonParse = (content: string): unknown => {
    return JSON.parse(content, (key, value) => {
        if (DANGEROUS_KEYS.has(key)) {
            throw new Error('File backup mengandung key berbahaya');
        }
        return value;
    });
};

const simpleChecksum = (value: unknown): string => {
    const text = JSON.stringify(value);
    let hash = 5381;
    for (let i = 0; i < text.length; i++) {
        hash = ((hash << 5) + hash) ^ text.charCodeAt(i);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
};

const validateAndSanitizeExport = (input: unknown): ExportData => {
    if (!isPlainObject(input)) {
        throw new Error('Format file tidak valid');
    }

    const version = typeof input.version === 'string' ? input.version : '';
    if (!version || version !== EXPORT_VERSION) {
        throw new Error(`Versi backup tidak didukung: ${version || 'tidak diketahui'}`);
    }

    if (!isPlainObject(input.data)) {
        throw new Error('Data backup tidak ditemukan atau rusak');
    }

    const data = DATA_TYPES.reduce((acc, type) => {
        const records = input.data[type];
        if (records === undefined) {
            acc[type] = [];
            return acc;
        }
        if (!Array.isArray(records)) {
            throw new Error(`Data ${type} harus berupa array`);
        }
        if (records.length > MAX_RECORDS_PER_TYPE) {
            throw new Error(`Data ${type} terlalu banyak untuk dipulihkan`);
        }
        acc[type] = sanitizeValue(records) as any[];
        return acc;
    }, {
        programs: [],
        classes: [],
        lecturers: [],
        courses: [],
        assignments: [],
        schedules: [],
        settings: []
    } as UserData);

    const profile = isPlainObject(input.profile)
        ? {
            id: typeof input.profile.id === 'string' ? input.profile.id.slice(0, 120) : '',
            name: typeof input.profile.name === 'string' ? input.profile.name.slice(0, 120) : 'Imported User',
            email: typeof input.profile.email === 'string' ? input.profile.email.slice(0, 180) : ''
        }
        : null;

    const exportedAt = typeof input.exportedAt === 'string'
        ? input.exportedAt.slice(0, 80)
        : new Date().toISOString();
    const userId = typeof input.userId === 'string'
        ? input.userId.slice(0, 120)
        : 'imported';

    const cleanExport: ExportData = {
        version,
        exportedAt,
        userId,
        profile,
        data
    };

    if (typeof input.checksum === 'string') {
        const expected = simpleChecksum({
            version: cleanExport.version,
            exportedAt: cleanExport.exportedAt,
            userId: cleanExport.userId,
            profile: cleanExport.profile,
            data: cleanExport.data
        });
        if (input.checksum !== expected) {
            throw new Error('Checksum backup tidak cocok. File mungkin sudah berubah atau rusak');
        }
        cleanExport.checksum = input.checksum;
    }

    return cleanExport;
};

export class LocalStorageManager {
    private currentUser: string;

    constructor(userId: string = 'default') {
        this.currentUser = userId;
    }

    // Set current user
    setCurrentUser(userId: string) {
        this.currentUser = userId;
    }

    // Get storage key for current user
    private getKey(dataType: keyof UserData): string {
        return `${STORAGE_PREFIX}${this.currentUser}_${dataType}`;
    }

    // Get data for current user
    getData<T>(dataType: keyof UserData): T[] {
        try {
            const key = this.getKey(dataType);
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Error reading ${dataType} from localStorage:`, error);
            return [];
        }
    }

    // Save data for current user
    saveData<T>(dataType: keyof UserData, data: T[]): void {
        try {
            const key = this.getKey(dataType);
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`Error saving ${dataType} to localStorage:`, error);
        }
    }

    // Initialize user data with mock data ONLY if user has NO data at all
    initializeUserData(mockData: Partial<UserData>): void {
        // Check if user already has any data (use programs as indicator)
        const existingPrograms = this.getData('programs');
        if (existingPrograms.length > 0) {
            // User already has data, don't initialize anything
            return;
        }

        // Initialize all data types with mock data
        DATA_TYPES.forEach(type => {
            if (mockData[type]) {
                this.saveData(type, mockData[type]!);
            }
        });
    }

    // Clear all data for current user
    clearUserData(): void {
        DATA_TYPES.forEach(type => {
            const key = this.getKey(type);
            localStorage.removeItem(key);
        });
    }

    // Get all users
    static getAllUsers(): string[] {
        const users = new Set<string>();
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(STORAGE_PREFIX)) {
                const parts = key.replace(STORAGE_PREFIX, '').split('_');
                const userId = parts[0];
                if (userId && userId !== 'current') users.add(userId);
            }
        }
        return Array.from(users);
    }

    // Delete user and all their data
    static deleteUser(userId: string): void {
        const keysToDelete: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`${STORAGE_PREFIX}${userId}_`)) {
                keysToDelete.push(key);
            }
        }
        keysToDelete.forEach(key => localStorage.removeItem(key));
    }

    // Get current user profile
    getUserProfile(): { id: string; name: string; email: string } | null {
        try {
            const key = `${STORAGE_PREFIX}${this.currentUser}_profile`;
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error reading user profile:', error);
            return null;
        }
    }

    // Save user profile
    saveUserProfile(profile: { id: string; name: string; email: string }): void {
        try {
            const key = `${STORAGE_PREFIX}${this.currentUser}_profile`;
            localStorage.setItem(key, JSON.stringify(profile));
        } catch (error) {
            console.error('Error saving user profile:', error);
        }
    }

    // Export all user data to JSON
    exportUserData(): ExportData {
        const data: UserData = {
            programs: [],
            classes: [],
            lecturers: [],
            courses: [],
            assignments: [],
            schedules: [],
            settings: []
        };

        DATA_TYPES.forEach(type => {
            data[type] = this.getData(type);
        });

        const exportData: ExportData = {
            version: EXPORT_VERSION,
            exportedAt: new Date().toISOString(),
            userId: this.currentUser,
            profile: this.getUserProfile(),
            data
        };
        exportData.checksum = simpleChecksum(exportData);
        return exportData;
    }

    // Import user data from JSON
    importUserData(exportData: ExportData): { success: boolean; message: string } {
        try {
            const cleanExport = validateAndSanitizeExport(exportData);
            const restorePointKey = `${STORAGE_PREFIX}${this.currentUser}_restore_point`;
            localStorage.setItem(restorePointKey, JSON.stringify(this.exportUserData()));

            // Import each data type
            DATA_TYPES.forEach(type => {
                this.saveData(type, cleanExport.data[type]);
            });

            // Import profile if exists
            if (cleanExport.profile) {
                this.saveUserProfile({
                    ...cleanExport.profile,
                    id: this.currentUser // Use current user ID instead of imported
                });
            }

            return { success: true, message: 'Data berhasil dipulihkan. Restore point otomatis juga dibuat' };
        } catch (error) {
            console.error('Error importing user data:', error);
            return { success: false, message: 'Gagal mengimpor data: ' + (error as Error).message };
        }
    }

    hasRestorePoint(): boolean {
        return !!localStorage.getItem(`${STORAGE_PREFIX}${this.currentUser}_restore_point`);
    }

    restoreLastRestorePoint(): { success: boolean; message: string } {
        try {
            const restorePointKey = `${STORAGE_PREFIX}${this.currentUser}_restore_point`;
            const restorePoint = localStorage.getItem(restorePointKey);
            if (!restorePoint) {
                return { success: false, message: 'Restore point belum tersedia' };
            }

            const cleanExport = validateAndSanitizeExport(safeJsonParse(restorePoint));
            DATA_TYPES.forEach(type => {
                this.saveData(type, cleanExport.data[type]);
            });

            if (cleanExport.profile) {
                this.saveUserProfile({
                    ...cleanExport.profile,
                    id: this.currentUser
                });
            }

            return { success: true, message: 'Restore point terakhir berhasil dipulihkan' };
        } catch (error) {
            console.error('Error restoring restore point:', error);
            return { success: false, message: 'Gagal memulihkan restore point: ' + (error as Error).message };
        }
    }

    // Download user data as JSON file
    downloadAsFile(filename?: string): void {
        const exportData = this.exportUserData();
        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `dosen-sks-backup-${this.currentUser}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Import from file (returns promise for async file reading)
    static importFromFile(file: File): Promise<ExportData> {
        return new Promise((resolve, reject) => {
            if (!file.name.toLowerCase().endsWith('.json')) {
                reject(new Error('File harus berformat .json'));
                return;
            }

            if (file.size > MAX_IMPORT_SIZE_BYTES) {
                reject(new Error('Ukuran file backup terlalu besar. Maksimal 5 MB'));
                return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    if (!content || content.length > MAX_IMPORT_SIZE_BYTES) {
                        throw new Error('Ukuran file backup terlalu besar');
                    }
                    const data = validateAndSanitizeExport(safeJsonParse(content));
                    resolve(data);
                } catch (error) {
                    reject(error instanceof Error ? error : new Error('File tidak valid atau rusak'));
                }
            };
            reader.onerror = () => reject(new Error('Gagal membaca file'));
            reader.readAsText(file);
        });
    }
}

// Singleton instance
let storageInstance: LocalStorageManager | null = null;

export const getStorageManager = (userId?: string): LocalStorageManager => {
    if (!storageInstance) {
        storageInstance = new LocalStorageManager(userId || 'default');
    } else if (userId) {
        storageInstance.setCurrentUser(userId);
    }
    return storageInstance;
};

// Helper to get current user ID from localStorage
export const getCurrentUserId = (): string => {
    return localStorage.getItem(`${STORAGE_PREFIX}current_user`) || 'default';
};

// Helper to set current user ID
export const setCurrentUserId = (userId: string): void => {
    localStorage.setItem(`${STORAGE_PREFIX}current_user`, userId);
    if (storageInstance) {
        storageInstance.setCurrentUser(userId);
    }
};

// Get all profiles with their info
export const getAllProfiles = (): Array<{ id: string; name: string; email: string }> => {
    const userIds = LocalStorageManager.getAllUsers();
    const profiles: Array<{ id: string; name: string; email: string }> = [];
    
    userIds.forEach(userId => {
        const storage = new LocalStorageManager(userId);
        const profile = storage.getUserProfile();
        if (profile) {
            profiles.push(profile);
        } else {
            profiles.push({ id: userId, name: userId, email: '' });
        }
    });
    
    return profiles;
};

// Create new profile
export const createProfile = (name: string, email: string = ''): string => {
    const profileId = name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now().toString(36);
    const storage = new LocalStorageManager(profileId);
    storage.saveUserProfile({ id: profileId, name, email });
    return profileId;
};

// Delete profile
export const deleteProfile = (userId: string): void => {
    LocalStorageManager.deleteUser(userId);
    // If deleted profile is current, switch to default
    if (getCurrentUserId() === userId) {
        const remaining = LocalStorageManager.getAllUsers();
        setCurrentUserId(remaining.length > 0 ? remaining[0] : 'default');
    }
};
