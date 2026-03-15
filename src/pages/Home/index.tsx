import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet, useOutletContext } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Hooks (Now in features/dashboard/hooks)
import { useHomeData } from '../../features/dashboard/hooks/useHomeData';
import { useDashboardData } from '../../features/dashboard/hooks/useDashboardData';
import { useGroupPdfGenerator } from '../../features/dashboard/hooks/useGroupPdfGenerator';

// Components
import DashboardHeader from '../../features/dashboard/components/DashboardHeader';

// Modals
import RandomPickerModal from '../../components/RandomPickerModal';
import WeeklyPlannerModal from '../../components/WeeklyPlannerModal';
import ResponsibilityOverviewModal from '../../features/responsibilities/components/ResponsibilityOverviewModal';

const Home: React.FC = () => {
    const navigate = useNavigate();

    // Context from Layout
    const { isSidebarOpen, session } = useOutletContext<{ isSidebarOpen: boolean; session?: any }>() || { isSidebarOpen: false };
    const sessionUserId = session?.user?.id;

    // Use extracted hooks - NOW using React Query internally
    // We pass sessionUserId to allow immediate fetching without waiting for async getCurrentUser
    const {
        user,
        userName,
        students,
        groups,
        selectedGroup,
        setSelectedGroup,
        loading,
        refetch
    } = useHomeData(sessionUserId);

    const {
        dashboardData,
        loading: loadingStats
    } = useDashboardData(sessionUserId, students);

    const {
        generateGroupTodoList,
        cancelGeneration,
        isGenerating,
        progress: pdfProgress,
        progressText
    } = useGroupPdfGenerator();

    // Local state
    // Derived state from URL or default to 'overview'
    // Map URL path to Tab ID
    const location = useLocation();
    const currentPath = location.pathname.split('/').pop() || 'overview';

    // Map path to tab ID (path might be 'vue-d-ensemble', tab is 'overview')
    const pathToTab: Record<string, string> = {
        'vue-d-ensemble': 'overview',
        'eleves': 'students',
        'avant-mail': 'avant-mail',
        'vue-retard': 'vue-retard',
        'travaux-domicile': 'travaux-domicile',
        'travaux-classe': 'travaux-classe'
    };

    const tabToPath: Record<string, string> = {
        'overview': 'vue-d-ensemble',
        'students': 'eleves',
        'avant-mail': 'avant-mail',
        'vue-retard': 'vue-retard',
        'travaux-domicile': 'travaux-domicile',
        'travaux-classe': 'travaux-classe'
    };

    const currentTab = pathToTab[currentPath] || 'overview';

    const setCurrentTab = (tab: string) => {
        // Navigate to the correct path
        const path = tabToPath[tab] || 'vue-d-ensemble';
        navigate(`/dashboard/${path}`);
    };

    const [searchQuery, setSearchQuery] = useState('');
    const [isRandomPickerOpen, setIsRandomPickerOpen] = useState(false);
    const [isWeeklyPlannerOpen, setIsWeeklyPlannerOpen] = useState(false);
    const [isResponsibilityOverviewOpen, setIsResponsibilityOverviewOpen] = useState(false);

    // ESC key handler for PDF generation
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (isGenerating && e.key === 'Escape') cancelGeneration();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isGenerating, cancelGeneration]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const contextValue = {
        user,
        dashboardData,
        students,
        groups,
        selectedGroup,
        setSelectedGroup,
        generateGroupTodoList,
        isGenerating,
        progress: pdfProgress,
        progressText,
        loading: loadingStats,
        searchQuery,
        setSearchQuery,
        setIsWeeklyPlannerOpen,
        setIsResponsibilityOverviewOpen,
        refetch
    };


    return (
        <div className="space-y-6 pb-12 animate-in fade-in duration-500" >

            <DashboardHeader
                userName={userName}
                userEmail={user?.email || null}
                currentTab={currentTab}
                setCurrentTab={setCurrentTab}
                showSearch={false}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSidebarOpen={isSidebarOpen}
            />

            {loadingStats ? (
                <div className="h-96 flex flex-col items-center justify-center gap-4 text-grey-medium">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="font-bold uppercase tracking-widest text-xs">Préparation des données...</p>
                </div>
            ) : (
                <Outlet context={contextValue} />
            )}

            {/* Modals */}
            <RandomPickerModal
                isOpen={isRandomPickerOpen}
                onClose={() => setIsRandomPickerOpen(false)}
                students={students || []}
            />
            <WeeklyPlannerModal
                isOpen={isWeeklyPlannerOpen}
                onClose={() => setIsWeeklyPlannerOpen(false)}
            />
            <ResponsibilityOverviewModal
                isOpen={isResponsibilityOverviewOpen}
                onClose={() => setIsResponsibilityOverviewOpen(false)}
            />
        </div>
    );
};

export default Home;
