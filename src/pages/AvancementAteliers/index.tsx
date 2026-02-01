import React, { useEffect } from 'react';
import { supabase } from '../../lib/database';
// @ts-ignore
import { checkOverdueActivities } from '../../lib/helpers';
import { BookOpen } from 'lucide-react';
// @ts-ignore
import { useUpdateProgression } from '../../hooks/useUpdateProgression';

import { useAvancementData } from './hooks/useAvancementData';
import { useStudentsAndActivities, AvancementActivity } from './hooks/useStudentsAndActivities';
import { useAvancementPDF } from './hooks/useAvancementPDF';
import { useModuleSpans } from './hooks/useModuleSpans';
import { Student } from '../../features/attendance/services/attendanceService';

// Components
import { AvancementFilters } from './components/AvancementFilters';
import { AvancementTable } from './components/AvancementTable';

const AvancementAteliers: React.FC = () => {
    const { updateProgression } = useUpdateProgression();

    // Hooks
    const {
        groups, modules, branches,
        selectedGroupId, setSelectedGroupId,
        selectedModuleId, setSelectedModuleId,
        selectedBrancheId, setSelectedBrancheId,
        selectedDateFin, setSelectedDateFin,
        dateOperator, setDateOperator,
        getFilteredModules
    } = useAvancementData();

    const {
        students, activities, progressions, setProgressions, loading
    } = useStudentsAndActivities(selectedGroupId, selectedModuleId, selectedDateFin, selectedBrancheId, getFilteredModules);

    const { handleGeneratePDF } = useAvancementPDF();
    const { moduleSpans, lastActivityIds } = useModuleSpans(activities);

    // Initial data load with overdue check
    useEffect(() => {
        const loadInitialData = async () => {
            const { data } = await supabase.auth.getSession();
            if (data?.session) {
                await checkOverdueActivities(data.session.user.id);
            }
        };
        loadInitialData();
    }, []);

    const handleStatusClick = async (student: Student, activity: AvancementActivity) => {
        const activityLevels = activity.ActiviteNiveau?.map(an => an.niveau_id) || [];
        const isAllowed = activityLevels.length > 0 && student.niveau_id && activityLevels.includes(student.niveau_id);

        if (!isAllowed) return;

        const currentStatus = progressions[`${student.id}-${activity.id}`] || 'a_commencer';
        const key = `${student.id}-${activity.id}`;

        await updateProgression(student.id, activity.id, currentStatus, {
            onOptimisticUpdate: (nextStatus: string) => {
                setProgressions(prev => ({ ...prev, [key]: nextStatus }));
            },
            onRevert: (oldStatus: string) => {
                setProgressions(prev => ({ ...prev, [key]: oldStatus }));
            }
        });
    };

    const onGeneratePDF = () => {
        handleGeneratePDF({
            students, activities, progressions, groups, modules, branches,
            selectedGroupId, selectedModuleId, selectedBrancheId, selectedDateFin, dateOperator
        });
    };

    return (
        <div className="flex flex-col h-full bg-background p-6 space-y-6 overflow-hidden">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <BookOpen className="text-primary" />
                    Avancement des Ateliers
                </h1>
                <button
                    onClick={onGeneratePDF}
                    disabled={students.length === 0 || activities.length === 0}
                    className="bg-primary hover:bg-primary/90 text-black px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Exporter PDF
                </button>
            </div>

            {/* FILTERS BAR */}
            <AvancementFilters
                groups={groups}
                modules={modules}
                branches={branches}
                selectedGroupId={selectedGroupId}
                setSelectedGroupId={setSelectedGroupId}
                dateOperator={dateOperator}
                setDateOperator={setDateOperator}
                selectedDateFin={selectedDateFin}
                setSelectedDateFin={setSelectedDateFin}
                selectedBrancheId={selectedBrancheId}
                setSelectedBrancheId={setSelectedBrancheId}
                selectedModuleId={selectedModuleId}
                setSelectedModuleId={setSelectedModuleId}
                getFilteredModules={getFilteredModules}
                onModuleSelectReset={() => setSelectedModuleId('')}
            />

            {/* MAIN TABLE CONTENT */}
            <AvancementTable
                loading={loading}
                students={students}
                activities={activities}
                progressions={progressions}
                moduleSpans={moduleSpans}
                modules={modules}
                lastActivityIds={lastActivityIds}
                onStatusClick={handleStatusClick}
                selectedGroupId={selectedGroupId}
                selectedModuleId={selectedModuleId}
                selectedDateFin={selectedDateFin}
            />
        </div>
    );
};

export default AvancementAteliers;
