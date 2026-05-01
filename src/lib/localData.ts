import { getStorageManager, getCurrentUserId } from './storage';
import { canUseLocalFallback } from './dataMode';
import { 
    mockPrograms, 
    mockClasses, 
    mockCourses, 
    mockLecturers, 
    mockAssignments, 
    mockSchedules 
} from '@/data/mockData';

export type DataType = 'programs' | 'classes' | 'lecturers' | 'courses' | 'assignments' | 'schedules' | 'settings';

// Track if initialization has been done for current session
let initialized = false;
let initializedUserId: string | null = null;

// Initialize data for current user ONLY if no data exists at all
export const initializeUserData = () => {
    if (!canUseLocalFallback()) {
        return;
    }

    const userId = getCurrentUserId();
    
    // Skip if already initialized for this user in this session
    if (initialized && initializedUserId === userId) {
        return;
    }
    
    const storage = getStorageManager(userId);
    
    // Check if user has ANY data already (check programs as indicator)
    const existingPrograms = storage.getData('programs');
    if (existingPrograms.length > 0) {
        // User already has data, don't overwrite
        initialized = true;
        initializedUserId = userId;
        return;
    }
    
    // Only initialize if completely empty
    const defaultAcademicYear = mockSchedules[0]?.academic_year || '2024/2025 Genap';
    const mockData = {
        programs: mockPrograms,
        classes: mockClasses,
        lecturers: mockLecturers,
        courses: mockCourses,
        assignments: mockAssignments.map(a => ({
            id: a.id,
            lecturer_id: a.lecturer_id,
            course_id: a.course_id,
            class_id: a.class_id,
            academic_year: defaultAcademicYear,
            created_at: a.created_at
        })),
        schedules: mockSchedules.map(s => ({
            id: s.id,
            assignment_id: s.assignment_id,
            academic_year: s.academic_year,
            day_of_week: s.day_of_week,
            time_slot: s.time_slot,
            has_conflict: s.has_conflict,
            created_at: s.created_at,
            updated_at: s.updated_at
        })),
        settings: []
    };
    
    storage.initializeUserData(mockData);
    initialized = true;
    initializedUserId = userId;
};

// Get data from localStorage for current user
export const getLocalData = <T>(dataType: DataType): T[] => {
    const userId = getCurrentUserId();
    const storage = getStorageManager(userId);
    return storage.getData<T>(dataType);
};

// Save data to localStorage for current user
export const saveLocalData = <T>(dataType: DataType, data: T[]): void => {
    const userId = getCurrentUserId();
    const storage = getStorageManager(userId);
    storage.saveData(dataType, data);
};

// Helper to get data - returns empty array if no data (no auto-init with mock)
export const getLocalDataWithInit = <T>(dataType: DataType, _mockData: T[]): T[] => {
    // Just return what's in storage, don't auto-initialize
    return getLocalData<T>(dataType);
};

// CRUD helpers
export const addLocalItem = <T extends { id: string }>(dataType: DataType, item: T): T => {
    const data = getLocalData<T>(dataType);
    const newItem = {
        ...item,
        id: item.id || Math.random().toString(36).substr(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };
    data.push(newItem);
    saveLocalData(dataType, data);
    return newItem;
};

export const updateLocalItem = <T extends { id: string }>(dataType: DataType, id: string, updates: Partial<T>): T | null => {
    const data = getLocalData<T>(dataType);
    const index = data.findIndex(item => item.id === id);
    if (index === -1) return null;
    
    const updatedItem = {
        ...data[index],
        ...updates,
        updated_at: new Date().toISOString()
    };
    data[index] = updatedItem;
    saveLocalData(dataType, data);
    return updatedItem;
};

export const deleteLocalItem = <T extends { id: string }>(dataType: DataType, id: string): boolean => {
    const data = getLocalData<T>(dataType);
    const filtered = data.filter(item => item.id !== id);
    if (filtered.length === data.length) return false;
    saveLocalData(dataType, filtered);
    return true;
};
