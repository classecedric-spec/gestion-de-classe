import { useState, useEffect, useCallback } from 'react';

interface ModuleFormData {
    name: string;
    endDate: string;
    branchId: string;
    subBranchId: string;
    status: string;
}

interface ModuleWithDetails {
    id: string;
    nom: string;
    date_fin?: string | null;
    sous_branche_id?: string | null;
    statut?: string | null;
    SousBranche?: {
        id: string;
        nom: string;
        branche_id: string;
        Branche?: { id: string; nom: string } | null;
    } | null;
}

/**
 * Helper to get the second Friday (next week)
 */
const getNextNextFriday = () => {
    const today = new Date();
    const currentDay = today.getDay();
    let daysUntilNextFriday = 5 - currentDay;
    if (daysUntilNextFriday < 0) daysUntilNextFriday += 7;
    
    const f1 = new Date(today);
    f1.setDate(today.getDate() + daysUntilNextFriday);
    
    const f2 = new Date(f1);
    f2.setDate(f1.getDate() + 7);
    
    return f2.toISOString().split('T')[0];
};

/**
 * Hook for managing module form state
 */
export const useModuleForm = (moduleToEdit?: ModuleWithDetails | null) => {
    const [formData, setFormData] = useState<ModuleFormData>({
        name: '',
        endDate: getNextNextFriday(),
        branchId: '',
        subBranchId: '',
        status: 'en_cours'
    });

    useEffect(() => {
        if (moduleToEdit) {
            setFormData({
                name: moduleToEdit.nom,
                endDate: moduleToEdit.date_fin || '',
                branchId: moduleToEdit.SousBranche?.branche_id || '',
                subBranchId: moduleToEdit.sous_branche_id || '',
                status: moduleToEdit.statut || 'en_cours'
            });
        }
    }, [moduleToEdit]);

    const resetForm = useCallback(() => {
        setFormData({
            name: '',
            endDate: getNextNextFriday(),
            branchId: '',
            subBranchId: '',
            status: 'en_cours'
        });
    }, []);

    const updateField = (field: keyof ModuleFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isValid = formData.name.trim() !== '' && formData.subBranchId !== '';

    return {
        formData,
        updateField,
        isValid,
        resetForm
    };
};
