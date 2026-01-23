import { useState } from 'react';
import { getCurrentUser } from '../lib/database';
import { moduleService } from '../features/modules/services/moduleService';

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
 * Hook for submitting module data (create or update)
 */
export const useModuleSubmit = (
    moduleToEdit: ModuleWithDetails | null | undefined,
    onSuccess: (module: ModuleWithDetails) => void
) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (formData: {
        name: string;
        subBranchId: string;
        status: string;
        endDate: string;
    }) => {
        setLoading(true);
        setError(null);

        try {
            const user = await getCurrentUser();
            if (!user) throw new Error("Vous devez être connecté.");

            const moduleData: any = {
                nom: formData.name.trim(),
                sous_branche_id: formData.subBranchId,
                statut: formData.status,
                date_fin: formData.endDate || null
            };

            let savedModule: any;

            if (moduleToEdit) {
                await moduleService.updateModule(moduleToEdit.id, moduleData);
                // The service updateModule doesn't return data with joins usually.
                // We might need a getModuleWithDetails in the service.
                savedModule = await moduleService.getModuleDetails(moduleToEdit.id);
            } else {
                const created = await moduleService.createModule({
                    ...moduleData,
                    user_id: user.id
                });
                savedModule = await moduleService.getModuleDetails(created.id);
            }

            onSuccess(savedModule);
        } catch (err: any) {
            setError(err.message || "Erreur lors de l'enregistrement.");
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { submit, loading, error };
};
