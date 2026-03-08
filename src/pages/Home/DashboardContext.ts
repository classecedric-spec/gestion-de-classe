import { Tables } from '../../types/supabase';
import { DashboardData } from '../../features/dashboard/hooks/useDashboardData';
import { Student } from '../../features/attendance/services/attendanceService';

export interface DashboardContextType {
    user: any;
    dashboardData: DashboardData;
    students: Student[];
    groups: Tables<'Groupe'>[];
    selectedGroup: Tables<'Groupe'> | null;
    setSelectedGroup: (group: Tables<'Groupe'> | null) => void;
    generateGroupTodoList: (group: Tables<'Groupe'> | null) => void;
    isGenerating: boolean;
    progress: number;
    progressText: string;
    loading: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    setIsWeeklyPlannerOpen: (isOpen: boolean) => void;
    setIsResponsibilityOverviewOpen: (isOpen: boolean) => void;
}
