import { useState, useEffect } from 'react';

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
 * Hook for managing module form state
 */
export const useModuleForm = (moduleToEdit?: ModuleWithDetails | null) => {
    const [formData, setFormData] = useState<ModuleFormData>({
        name: '',
        endDate: '',
        branchId: '',
        subBranchId: '',
        status: 'en_preparation'
    });

    useEffect(() => {
        if (moduleToEdit) {
            setFormData({
                name: moduleToEdit.nom,
                endDate: moduleToEdit.date_fin || '',
                branchId: moduleToEdit.SousBranche?.branche_id || '',
                subBranchId: moduleToEdit.sous_branche_id || '',
                status: moduleToEdit.statut || 'en_preparation'
            });
        } else {
            setFormData({
                name: '',
                endDate: '',
                branchId: '',
                subBranchId: '',
                status: 'en_preparation'
            });
        }
    }, [moduleToEdit]);

    const updateField = (field: keyof ModuleFormData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const isValid = formData.name.trim() !== '' && formData.subBranchId !== '';

    return {
        formData,
        updateField,
        isValid
    };
};
