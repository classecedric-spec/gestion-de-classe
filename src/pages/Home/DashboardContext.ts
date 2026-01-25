import { Action, Group } from '../../types/supabase'; // Adjust types
import { DashboardData } from '../../features/dashboard/hooks/useDashboardData';
import { Student } from '../../features/attendance/services/attendanceService';

export interface DashboardContextType {
    user: any;
    dashboardData: DashboardData;
    students: Student[];
    groups: Group[];
    selectedGroup: Group | null;
    setSelectedGroup: (group: Group | null) => void;
    generateGroupTodoList: (group: Group | null) => void;
    isGenerating: boolean;
    progress: number;
    progressText: string;
    loading: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    setIsWeeklyPlannerOpen: (isOpen: boolean) => void;
}
