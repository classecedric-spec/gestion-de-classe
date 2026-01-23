import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMobileEncodingFlow } from '../hooks/useMobileEncodingFlow';
import { useGroupsData } from '../hooks/useGroupsData';
import { useStudentsData } from '../hooks/useStudentsData';
import { useModulesData } from '../hooks/useModulesData';
import { useActivityStatus } from '../hooks/useActivityStatus';
import { MobileEncodingHeader } from '../components/mobile-encoding/MobileEncodingHeader';
import { GroupsList } from '../components/mobile-encoding/GroupsList';
import { StudentsList } from '../components/mobile-encoding/StudentsList';
import { ModulesList } from '../components/mobile-encoding/ModulesList';

/**
 * Mobile Encoding Page
 * Multi-step flow for encoding student activity progressions
 */
const MobileEncodage: React.FC = () => {
    const navigate = useNavigate();

    // Flow management
    const {
        step,
        selectedGroup,
        selectedStudent,
        expandedModuleId,
        selectGroup,
        selectStudent,
        toggleModule,
        goBack
    } = useMobileEncodingFlow();

    // Data fetching
    const { groups, loading: loadingGroups } = useGroupsData();
    const { students, loading: loadingStudents } = useStudentsData(selectedGroup?.id || null);
    const {
        modules,
        progressions,
        loading: loadingModules,
        updateProgression
    } = useModulesData(
        selectedStudent?.id || null,
        selectedStudent?.niveau_id || null
    );

    // Activity status management
    const { updateStatus, savingActivity } = useActivityStatus(
        selectedStudent?.id || null,
        updateProgression
    );

    // Handlers
    const handleBack = () => {
        const shouldNavigateToDashboard = goBack();
        if (shouldNavigateToDashboard === null && step === 'groups') {
            navigate('/mobile-dashboard');
        }
    };

    const handleSelectGroup = (group: any) => {
        selectGroup(group);
    };

    const handleSelectStudent = (student: any) => {
        selectStudent(student);
    };

    const handleToggleModule = (moduleId: string) => {
        toggleModule(moduleId);
    };

    const handleNavigateHome = () => {
        navigate('/mobile-dashboard');
    };

    return (
        <div className="min-h-screen bg-background text-text-main font-sans flex flex-col">
            <MobileEncodingHeader
                step={step}
                selectedGroup={selectedGroup}
                selectedStudent={selectedStudent}
                onBack={handleBack}
                onNavigateHome={handleNavigateHome}
            />

            <main className="flex-1 overflow-y-auto">
                {step === 'groups' && (
                    <GroupsList
                        groups={groups}
                        loading={loadingGroups}
                        onSelectGroup={handleSelectGroup}
                    />
                )}

                {step === 'students' && (
                    <StudentsList
                        students={students}
                        loading={loadingStudents}
                        onSelectStudent={handleSelectStudent}
                    />
                )}

                {step === 'modules' && (
                    <ModulesList
                        modules={modules}
                        loading={loadingModules}
                        expandedModuleId={expandedModuleId}
                        progressions={progressions}
                        savingActivity={savingActivity}
                        onToggleModule={handleToggleModule}
                        onUpdateStatus={updateStatus}
                    />
                )}
            </main>
        </div>
    );
};

export default MobileEncodage;
