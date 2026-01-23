import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { supabase } from '../../../lib/database';
import { activityService, ActivityWithRelations } from '../services/activityService';
import { Tables } from '../../../types/supabase';

interface ActivityLevelState {
    id?: string;
    niveau_id: string;
    nom_niveau?: string;
    nombre_exercices: number | string;
    nombre_erreurs: number | string;
    statut_exigence: string;
}

interface ActivityFormProps {
    activityToEdit?: ActivityWithRelations | null;
    defaultModuleId?: string | null;
    defaultModuleName?: string | null;
    nextOrder?: number;
    onAdded: () => void;
    onClose: () => void;
}

interface UseActivityFormReturn {
    title: string;
    setTitle: Dispatch<SetStateAction<string>>;
    moduleId: string;
    setModuleId: Dispatch<SetStateAction<string>>;
    moduleName: string;
    setModuleName: Dispatch<SetStateAction<string>>;
    nbExercises: number | string;
    setNbExercises: Dispatch<SetStateAction<number | string>>;
    nbErrors: number | string;
    setNbErrors: Dispatch<SetStateAction<number | string>>;
    requirementStatus: string;
    setRequirementStatus: Dispatch<SetStateAction<string>>;
    selectedMaterialTypes: string[];
    activityLevels: ActivityLevelState[];
    levels: Tables<'Niveau'>[];
    loading: boolean;
    error: string | null;
    handleAddLevel: (levelId: string, currentNbExercises: number | string, currentNbErrors: number | string, currentStatus: string) => void;
    handleRemoveLevel: (levelId: string) => void;
    updateActivityLevel: (index: number, field: string, value: any) => void;
    toggleMaterialType: (id: string) => void;
    submitForm: () => Promise<boolean>;
}

export const useActivityForm = ({
    activityToEdit,
    defaultModuleId,
    defaultModuleName,
    nextOrder,
    onAdded,
    onClose
}: ActivityFormProps): UseActivityFormReturn => {
    // Basic Info
    const [title, setTitle] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [moduleName, setModuleName] = useState('');

    // Requirements
    const [nbExercises, setNbExercises] = useState<number | string>('');
    const [nbErrors, setNbErrors] = useState<number | string>(1);
    const [requirementStatus, setRequirementStatus] = useState('obligatoire');

    // Relations
    const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
    const [activityLevels, setActivityLevels] = useState<ActivityLevelState[]>([]);

    // Data Sources
    const [levels, setLevels] = useState<Tables<'Niveau'>[]>([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initial Data Fetching
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Load Levels
                const levelsData = await activityService.getLevels();
                setLevels(levelsData);

                // Initialize Form Mode
                if (activityToEdit) {
                    setTitle(activityToEdit.titre);
                    setModuleId(activityToEdit.module_id || '');

                    if (activityToEdit.Module?.titre) {
                        setModuleName(activityToEdit.Module.titre);
                    } else if (activityToEdit.module_id) {
                        const mod = await activityService.getModule(activityToEdit.module_id);
                        if (mod?.titre) setModuleName(mod.titre);
                    }

                    setNbExercises(activityToEdit.nombre_exercices ?? 1);
                    setNbErrors(activityToEdit.nombre_erreurs ?? 1);
                    setRequirementStatus(activityToEdit.statut_exigence || 'obligatoire');

                    // Fetch existing relations
                    const materials = await activityService.getActivityMaterials(activityToEdit.id);
                    setSelectedMaterialTypes(materials.map(m => m.type_materiel_id).filter((id): id is string => id !== null));

                    const actLevels = await activityService.getActivityLevels(activityToEdit.id);
                    if (actLevels) {
                        setActivityLevels(actLevels.map(item => ({
                            id: item.id,
                            niveau_id: item.niveau_id!,
                            nom_niveau: (item as any).Niveau?.nom,
                            nombre_exercices: item.nombre_exercices!,
                            nombre_erreurs: item.nombre_erreurs!,
                            statut_exigence: item.statut_exigence!
                        })));
                    }
                } else {
                    // Reset / Defaults
                    setTitle('');
                    setModuleId(defaultModuleId || '');
                    setModuleName(defaultModuleName || '');
                    setNbExercises('');
                    setNbErrors(1);
                    setRequirementStatus('obligatoire');
                    setSelectedMaterialTypes([]);
                    setActivityLevels([]);
                }
            } catch (err: any) {
                console.error("Error loading activity form data:", err);
                setError("Erreur au chargement des données");
            }
        };

        loadInitialData();
    }, [activityToEdit, defaultModuleId, defaultModuleName]);

    // Actions
    const handleAddLevel = (levelId: string, currentNbExercises: number | string, currentNbErrors: number | string, currentStatus: string) => {
        const level = levels.find(l => l.id === levelId);
        if (!level) return;

        setActivityLevels(prev => [...prev, {
            niveau_id: level.id,
            nom_niveau: level.nom,
            nombre_exercices: currentNbExercises,
            nombre_erreurs: currentNbErrors,
            statut_exigence: currentStatus
        }]);
    };

    const handleRemoveLevel = (levelId: string) => {
        setActivityLevels(prev => prev.filter(l => l.niveau_id !== levelId));
    };

    const updateActivityLevel = (index: number, field: string, value: any) => {
        setActivityLevels(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const toggleMaterialType = (id: string) => {
        setSelectedMaterialTypes(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const submitForm = async () => {
        if (!title.trim() || !moduleId) return false;

        setLoading(true);
        setError(null);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");

            const activityData = {
                ...(activityToEdit ? { id: activityToEdit.id } : {}),
                titre: title.trim(),
                module_id: moduleId,
                nombre_exercices: typeof nbExercises === 'string' ? parseInt(nbExercises) || 1 : nbExercises,
                nombre_erreurs: typeof nbErrors === 'string' ? parseInt(nbErrors) || 1 : nbErrors,
                statut_exigence: requirementStatus,
                user_id: user.id
            };

            if (!activityToEdit) {
                (activityData as any).ordre = nextOrder || 0;
            }

            await activityService.saveActivity(
                activityData,
                selectedMaterialTypes,
                activityLevels,
                !!activityToEdit
            );

            onAdded();
            onClose();
            return true;
        } catch (err: any) {
            console.error("Error saving activity:", err);
            setError(err.message);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        // State
        title, setTitle,
        moduleId, setModuleId,
        moduleName, setModuleName,
        nbExercises, setNbExercises,
        nbErrors, setNbErrors,
        requirementStatus, setRequirementStatus,
        selectedMaterialTypes,
        activityLevels,
        levels,
        loading,
        error,

        // Actions
        handleAddLevel,
        handleRemoveLevel,
        updateActivityLevel,
        toggleMaterialType,
        submitForm
    };
};
