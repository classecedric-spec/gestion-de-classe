import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { activityService } from '../services/activityService';

export const useActivityForm = ({ activityToEdit, defaultModuleId, defaultModuleName, nextOrder, onAdded, onClose }) => {
    // Basic Info
    const [title, setTitle] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [moduleName, setModuleName] = useState('');

    // Requirements
    const [nbExercises, setNbExercises] = useState('');
    const [nbErrors, setNbErrors] = useState(1);
    const [requirementStatus, setRequirementStatus] = useState('obligatoire');

    // Relations
    const [selectedMaterialTypes, setSelectedMaterialTypes] = useState([]);
    const [activityLevels, setActivityLevels] = useState([]);

    // Data Sources
    const [levels, setLevels] = useState([]);

    // UI State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

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

                    if (activityToEdit.Module?.nom) {
                        setModuleName(activityToEdit.Module.nom);
                    } else if (activityToEdit.module_id) {
                        const mod = await activityService.getModule(activityToEdit.module_id);
                        if (mod) setModuleName(mod.nom);
                    }

                    setNbExercises(activityToEdit.nombre_exercices ?? 1);
                    setNbErrors(activityToEdit.nombre_erreurs ?? 1);
                    setRequirementStatus(activityToEdit.statut_exigence || 'obligatoire');

                    // Fetch existing relations
                    const materials = await activityService.getActivityMaterials(activityToEdit.id);
                    setSelectedMaterialTypes(materials.map(m => m.type_materiel_id));

                    const actLevels = await activityService.getActivityLevels(activityToEdit.id);
                    if (actLevels) {
                        setActivityLevels(actLevels.map(item => ({
                            id: item.id,
                            niveau_id: item.niveau_id,
                            nom_niveau: item.Niveau?.nom,
                            nombre_exercices: item.nombre_exercices,
                            nombre_erreurs: item.nombre_erreurs,
                            statut_exigence: item.statut_exigence
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
            } catch (err) {
                console.error("Error loading activity form data:", err);
                setError("Erreur au chargement des données");
            }
        };

        loadInitialData();
    }, [activityToEdit, defaultModuleId, defaultModuleName]);

    // Actions
    const handleAddLevel = (levelId, currentNbExercises, currentNbErrors, currentStatus) => {
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

    const handleRemoveLevel = (levelId) => {
        setActivityLevels(prev => prev.filter(l => l.niveau_id !== levelId));
    };

    const updateActivityLevel = (index, field, value) => {
        setActivityLevels(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };
            return updated;
        });
    };

    const toggleMaterialType = (id) => {
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

            const activityData = {
                ...(activityToEdit ? { id: activityToEdit.id } : {}),
                titre: title.trim(),
                module_id: moduleId,
                nombre_exercices: parseInt(nbExercises) || 1,
                nombre_erreurs: parseInt(nbErrors) || 1,
                statut_exigence: requirementStatus,
                user_id: user.id
            };

            if (!activityToEdit) {
                activityData.ordre = nextOrder || 0;
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
        } catch (err) {
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
