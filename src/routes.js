// Centralised route definitions for the application
// Import this file wherever you need to reference a path string.
export const ROUTES = {
    // Root & landing
    ROOT: '/',
    LANDING: '/',
    LANDING_MOBILE: '/mobile',
    // Dashboard base
    DASHBOARD: '/dashboard',
    // Dashboard sections
    DASHBOARD_SUIVI: '/dashboard/suivi',
    DASHBOARD_PRESENCE: '/dashboard/presence',
    DASHBOARD_USER: '/dashboard/user',
    DASHBOARD_ACTIVITIES: '/dashboard/activities',
    DASHBOARD_SETTINGS: '/dashboard/settings',
    // Sub‑pages under user management
    USER_GROUPS: '/dashboard/user/groups',
    USER_CLASSES: '/dashboard/user/classes',
    USER_STUDENTS: '/dashboard/user/students',
    USER_NIVEAUX: '/dashboard/user/niveaux',
    USER_ADULTS: '/dashboard/user/adults',
    // Sub‑pages under activities
    ACTIVITY_MODULES: '/dashboard/activities/modules',
    ACTIVITY_LIST: '/dashboard/activities/list',
    ACTIVITY_BRANCHES: '/dashboard/activities/branches',
    ACTIVITY_SUB_BRANCHES: '/dashboard/activities/sub-branches',
    ACTIVITY_MATERIELS: '/dashboard/activities/materiels',
    // Misc
    LOGIN: '/login',
    MOBILE_DASHBOARD: '/mobile-dashboard',
    MOBILE_PRESENCE: '/mobile-presence',
    MOBILE_ENCODAGE: '/mobile-encodage',
    MOBILE_SUVI: '/mobile-suivi',
    // ... add more routes as the app grows
};
