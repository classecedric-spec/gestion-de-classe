import {
    Home,
    UserCheck,
    GraduationCap,
    Users,
    Puzzle,
    Smartphone,
    Settings,
    Layers,
    BookOpen,
    User,
    Folder,
    FileText,
    GitBranch,
    Package,
    Mail,
    LucideIcon
} from 'lucide-react';
import { ROUTES } from '../routes';

export interface NavItem {
    icon: LucideIcon;
    label: string;
    path: string;
    isExternal?: boolean;
}

export interface NavSeparator {
    type: 'separator';
}

export type MainNavItem = NavItem | NavSeparator;

// Sidebar Navigation Items
export const MAIN_NAV_ITEMS: MainNavItem[] = [
    { icon: Home, label: 'Accueil', path: ROUTES.DASHBOARD },
    { type: 'separator' } as NavSeparator,
    { icon: UserCheck, label: 'Présence', path: ROUTES.DASHBOARD_PRESENCE },
    { icon: GraduationCap, label: 'Suivi Global', path: ROUTES.DASHBOARD_SUIVI },
    { type: 'separator' } as NavSeparator,
    { icon: Users, label: 'Utilisateurs', path: ROUTES.DASHBOARD_USER },
    { icon: Puzzle, label: 'Activités', path: ROUTES.DASHBOARD_ACTIVITIES },
    { icon: FileText, label: 'Responsabilités', path: ROUTES.DASHBOARD_RESPONSABILITES },
    { icon: Mail, label: 'Communications', path: ROUTES.DASHBOARD_COMMUNICATIONS },
    { type: 'separator' } as NavSeparator,
    { icon: Smartphone, label: 'Suivi Mobile', path: '/mobile-suivi', isExternal: true },
    { type: 'separator' } as NavSeparator,
    { icon: Settings, label: 'Paramètres', path: ROUTES.DASHBOARD_SETTINGS },
];

export interface ManagementTab {
    id: string;
    label: string;
    path: string;
    icon: LucideIcon;
}

// User Management Tabs
export const USER_MANAGEMENT_TABS: ManagementTab[] = [
    { id: 'groups', label: 'Groupes', path: ROUTES.USER_GROUPS, icon: Layers },
    { id: 'classes', label: 'Classes', path: ROUTES.USER_CLASSES, icon: BookOpen },
    { id: 'students', label: 'Élèves', path: ROUTES.USER_STUDENTS, icon: GraduationCap },
    { id: 'niveaux', label: 'Niveaux', path: ROUTES.USER_NIVEAUX, icon: Layers },
    { id: 'adults', label: 'Adultes', path: ROUTES.USER_ADULTS, icon: User },
];

// Activities Layout Tabs
export const ACTIVITIES_TABS: ManagementTab[] = [
    { id: 'modules', label: 'Modules', path: ROUTES.ACTIVITY_MODULES, icon: Folder },
    { id: 'activities', label: 'Activités', path: ROUTES.ACTIVITY_LIST, icon: FileText },
    { id: 'branches', label: 'Branches', path: ROUTES.ACTIVITY_BRANCHES, icon: GitBranch },
    { id: 'sub-branches', label: 'Sous-branches', path: ROUTES.ACTIVITY_SUB_BRANCHES, icon: Layers },
    { id: 'materiels', label: 'Matériel', path: ROUTES.ACTIVITY_MATERIELS, icon: Package },
];
