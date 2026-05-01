export const APP_ROLES = ['admin', 'operator', 'viewer', 'lecturer', 'user'] as const;

export type AppRole = typeof APP_ROLES[number];

export interface RoleCapability {
    canAccessApp: boolean;
    canManageAcademicData: boolean;
    canManageUsers: boolean;
    canPublishPosts: boolean;
}

export const ROLE_LABELS: Record<AppRole, string> = {
    admin: 'Admin',
    operator: 'Operator',
    viewer: 'Viewer',
    lecturer: 'Dosen',
    user: 'Menunggu Akses'
};

export const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
    admin: 'Akses penuh untuk setup, data akademik, jadwal, dan pengelolaan user.',
    operator: 'Disiapkan untuk operasional akademik setelah permission per halaman aktif.',
    viewer: 'Disiapkan untuk akses baca laporan dan monitoring.',
    lecturer: 'Disiapkan untuk akses dosen pada data mengajar masing-masing.',
    user: 'Akun sudah terdaftar, tetapi belum diberi akses operasional.'
};

const ROLE_CAPABILITIES: Record<AppRole, RoleCapability> = {
    admin: {
        canAccessApp: true,
        canManageAcademicData: true,
        canManageUsers: true,
        canPublishPosts: true
    },
    operator: {
        canAccessApp: false,
        canManageAcademicData: false,
        canManageUsers: false,
        canPublishPosts: false
    },
    viewer: {
        canAccessApp: false,
        canManageAcademicData: false,
        canManageUsers: false,
        canPublishPosts: false
    },
    lecturer: {
        canAccessApp: false,
        canManageAcademicData: false,
        canManageUsers: false,
        canPublishPosts: false
    },
    user: {
        canAccessApp: false,
        canManageAcademicData: false,
        canManageUsers: false,
        canPublishPosts: false
    }
};

export const normalizeRole = (role?: string | null): AppRole => {
    return APP_ROLES.includes(role as AppRole) ? role as AppRole : 'user';
};

export const getRoleCapabilities = (role?: string | null): RoleCapability => {
    return ROLE_CAPABILITIES[normalizeRole(role)];
};
