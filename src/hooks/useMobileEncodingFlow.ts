import { useState } from 'react';

interface FlowState {
    step: 'groups' | 'students' | 'modules';
    selectedGroup: any | null;
    selectedStudent: any | null;
    expandedModuleId: string | null;
}

/**
 * Hook for managing the mobile encoding flow navigation
 */
export const useMobileEncodingFlow = () => {
    const [state, setState] = useState<FlowState>({
        step: 'groups',
        selectedGroup: null,
        selectedStudent: null,
        expandedModuleId: null
    });

    const selectGroup = (group: any) => {
        setState(prev => ({
            ...prev,
            step: 'students',
            selectedGroup: group,
            selectedStudent: null,
            expandedModuleId: null
        }));
    };

    const selectStudent = (student: any) => {
        setState(prev => ({
            ...prev,
            step: 'modules',
            selectedStudent: student,
            expandedModuleId: null
        }));
    };

    const toggleModule = (moduleId: string) => {
        setState(prev => ({
            ...prev,
            expandedModuleId: prev.expandedModuleId === moduleId ? null : moduleId
        }));
    };

    const goBack = () => {
        setState(prev => {
            if (prev.step === 'students') {
                return { ...prev, step: 'groups', selectedGroup: null };
            } else if (prev.step === 'modules') {
                return { ...prev, step: 'students', selectedStudent: null, expandedModuleId: null };
            }
            return prev;
        });
        return null; // Return null when at 'groups' step to indicate navigation to dashboard
    };

    return {
        ...state,
        selectGroup,
        selectStudent,
        toggleModule,
        goBack
    };
};
