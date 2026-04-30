
export const mockPrograms = [
    { id: '1', name: 'Teknologi Informasi', code: 'TI', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '2', name: 'Teknik Sipil', code: 'TS', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '3', name: 'Teknik Mesin', code: 'TM', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '4', name: 'Akuntansi', code: 'AK', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '5', name: 'Administrasi Niaga', code: 'AN', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const mockClasses = [
    { id: '1', name: 'TI-1A', level: 1, program_id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '2', name: 'TI-1B', level: 1, program_id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '3', name: 'TI-3A', level: 3, program_id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '4', name: 'TS-1A', level: 1, program_id: '2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '5', name: 'TM-2A', level: 2, program_id: '3', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const mockCourses = [
    { id: '1', name: 'Pemrograman Web', sks: 3, level: 1, semester: 1, program_id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '2', name: 'Basis Data', sks: 4, level: 1, semester: 2, program_id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '3', name: 'Algoritma Pemrograman', sks: 3, level: 1, semester: 1, program_id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '4', name: 'Jaringan Komputer', sks: 3, level: 3, semester: 5, program_id: '1', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '5', name: 'Matematika Teknik', sks: 2, level: 1, semester: 1, program_id: '2', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: '6', name: 'Fisika Dasar', sks: 2, level: 1, semester: 1, program_id: '3', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

export const mockLecturers = [
    {
        id: '1',
        name: 'Dr. Budi Santoso',
        status: 'Fungsional',
        structural_position: 'Tidak Ada',
        program_id: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '2',
        name: 'Siti Aminah, M.Kom',
        status: 'Fungsional',
        structural_position: 'Kaprodi',
        program_id: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '3',
        name: 'Ir. Joko Widodo',
        status: 'LB',
        structural_position: 'Tidak Ada',
        program_id: '2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '4',
        name: 'Andi Wijaya, S.T., M.T.',
        status: 'Fungsional',
        structural_position: 'Wadir',
        program_id: '3',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
    {
        id: '5',
        name: 'Rina Kartika, S.Pd., M.Pd.',
        status: 'Fungsional',
        structural_position: 'Tidak Ada',
        program_id: '1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    },
];

export const mockAssignments = [
    {
        id: '1',
        lecturer_id: '1',
        course_id: '1',
        class_id: '1',
        created_at: new Date().toISOString(),
        lecturers: mockLecturers[0],
        courses: mockCourses[0],
        classes: mockClasses[0]
    },
    {
        id: '2',
        lecturer_id: '2',
        course_id: '2',
        class_id: '1',
        created_at: new Date().toISOString(),
        lecturers: mockLecturers[1],
        courses: mockCourses[1],
        classes: mockClasses[0]
    },
    {
        id: '3',
        lecturer_id: '5',
        course_id: '3',
        class_id: '2',
        created_at: new Date().toISOString(),
        lecturers: mockLecturers[4],
        courses: mockCourses[2],
        classes: mockClasses[1]
    }
];

export const mockSchedules = [
    {
        id: '1',
        assignment_id: '1',
        academic_year: '2024/2025 Genap',
        day_of_week: 1,
        time_slot: 0,
        has_conflict: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        assignments: mockAssignments[0]
    }
];
