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
    onSuccess: (module: ModuleWithDetails) => void,
    availableBranches: any[] = [],
    availableSubBranches: any[] = []
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
            let idCallback: string;

            if (moduleToEdit) {
                await moduleService.updateModule(moduleToEdit.id, moduleData);
                idCallback = moduleToEdit.id;
            } else {
                const created = await moduleService.createModule({
                    ...moduleData,
                    user_id: user.id
                });
                idCallback = created.id;
            }

            // Attempt to fetch full details
            try {
                savedModule = await moduleService.getModuleDetails(idCallback);
            } catch (fetchError) {
                console.warn("Could not fetch module details immediately, using fallback", fetchError);
            }

            // Fallback Construction if fetch failed or returned incomplete data
            // We check if we have the SubBranch relation if a subBranchId was provided
            const needsSubBranch = !!formData.subBranchId;
            const hasSubBranch = savedModule && savedModule.SousBranche;

            if (!savedModule || (needsSubBranch && !hasSubBranch)) {
                const subBranch = availableSubBranches.find(sb => String(sb.id) === String(formData.subBranchId));
                // If subBranch is found, use its branch_id to find the branch. 
                // If not (maybe hypothetical), try to find branch from the selected subBranch list if possible or passed arg.
                // Actually availableSubBranches usually belongs to the selected branch in the UI context.

                let branch: any = null;
                if (subBranch) {
                    branch = availableBranches.find(b => String(b.id) === String(subBranch.branche_id));
                }

                savedModule = {
                    id: idCallback,
                    ...moduleData,
                    created_at: new Date().toISOString(),
                    SousBranche: subBranch ? {
                        id: subBranch.id,
                        nom: subBranch.nom,
                        branche_id: subBranch.branche_id,
                        order: subBranch.ordre,
                        Branche: branch ? {
                            id: branch.id,
                            nom: branch.nom,
                            ordre: branch.ordre
                        } : null
                    } : null
                };
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
