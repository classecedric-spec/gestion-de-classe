/**
 * Nom du module/fichier : useActivityForm.ts
 * 
 * Données en entrée : Une activité à modifier (optionnel), les identifiants par défaut (module, ordre) et les fonctions de rappel (fermeture, succès).
 * 
 * Données en sortie : L'état complet du formulaire (titre, module, matériel, niveaux) et les fonctions pour manipuler ces données avant l'envoi.
 * 
 * Objectif principal : Gérer la complexité de la création ou de l'édition d'une activité. Ce Hook orchestre la saisie des informations de base, la sélection du matériel nécessaire, et la définition des exigences spécifiques pour chaque niveau scolaire (ex: 5 exercices pour les GS, 3 pour les MS).
 * 
 * Ce que ça affiche : Rien directement. Il fournit toute la "mécanique" au composant visuel `AddActivityModal`.
 */

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
    onAdded: (activity?: any) => void;
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

/**
 * Ce Hook est le moteur du formulaire d'activité. Il gère un état local riche et complexe.
 */
export const useActivityForm = ({
    activityToEdit,
    defaultModuleId,
    defaultModuleName,
    nextOrder,
    onAdded,
    onClose
}: ActivityFormProps): UseActivityFormReturn => {
    // Informations de base (Titre et Module d'appartenance)
    const [title, setTitle] = useState('');
    const [moduleId, setModuleId] = useState('');
    const [moduleName, setModuleName] = useState('');

    // Critères de réussite par défaut (utilisés si aucun niveau spécifique n'est défini)
    const [nbExercises, setNbExercises] = useState<number | string>('');
    const [nbErrors, setNbErrors] = useState<number | string>(1);
    const [requirementStatus, setRequirementStatus] = useState('obligatoire');

    // Relations complexes (Matériel sélectionné et Liste des exceptions par niveau)
    const [selectedMaterialTypes, setSelectedMaterialTypes] = useState<string[]>([]);
    const [activityLevels, setActivityLevels] = useState<ActivityLevelState[]>([]);

    // Sources de données pour remplir les listes déroulantes
    const [levels, setLevels] = useState<Tables<'Niveau'>[]>([]);

    // État de l'interface (chargement, erreurs)
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Chargement initial : au démarrage, on récupère les niveaux scolaires et, si on est en mode édition, 
    // on pré-remplit tous les champs avec les données de l'activité existante.
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                // Récupération de la liste des niveaux (PS, MS, GS, etc.)
                const levelsData = await activityService.getLevels();
                setLevels(levelsData);

                // Initialisation du mode formulaire
                if (activityToEdit) {
                    // Mode ÉDITION : on remplit avec les données existantes
                    setTitle(activityToEdit.titre);
                    setModuleId(activityToEdit.module_id || '');

                    if (activityToEdit.Module?.nom) {
                        setModuleName(activityToEdit.Module.nom);
                    } else if (activityToEdit.module_id) {
                        const mod = await activityService.getModule(activityToEdit.module_id);
                        if (mod?.nom) setModuleName(mod.nom);
                    }

                    setNbExercises(activityToEdit.nombre_exercices ?? 1);
                    setNbErrors(activityToEdit.nombre_erreurs ?? 1);
                    setRequirementStatus(activityToEdit.statut_exigence || 'obligatoire');

                    // Récupération du matériel déjà lié
                    const materials = await activityService.getActivityMaterials(activityToEdit.id);
                    setSelectedMaterialTypes(materials.map(m => m.type_materiel_id).filter((id): id is string => id !== null));

                    // Récupération des réglages spécifiques par niveau
                    if (activityToEdit.ActiviteNiveau && activityToEdit.ActiviteNiveau.length > 0) {
                        setActivityLevels(activityToEdit.ActiviteNiveau.map(item => ({
                            id: item.id,
                            niveau_id: item.niveau_id!,
                            nom_niveau: item.Niveau?.nom,
                            nombre_exercices: item.nombre_exercices!,
                            nombre_erreurs: item.nombre_erreurs!,
                            statut_exigence: item.statut_exigence!
                        })));
                    } else {
                        // Secours si les données n'étaient pas déjà chargées
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
                    }
                } else {
                    // Mode AJOUT : on réinitialise tout à zéro ou avec les valeurs par défaut
                    setTitle('');
                    setModuleId(defaultModuleId || '');
                    setModuleName(defaultModuleName || '');
                    setNbExercises(1);
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

    // Gestion multizone : permet d'ajouter une configuration spécifique pour un niveau scolaire (ex: ajouter une règle spéciale pour les CP).
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

    // Sélecteur de matériel : gère une liste d'identifiants que l'on ajoute ou retire d'un simple clic.
    const toggleMaterialType = (id: string) => {
        setSelectedMaterialTypes(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    // Validation et Envoi : vérifie que le formulaire est complet et déclenche la sauvegarde via `activityService`.
    const submitForm = async () => {
        // Validation minimale : un titre et un module sont obligatoires.
        if (!title.trim() || !moduleId) return false;

        // Une activité doit être liée à au moins un niveau pour être visible des élèves concernés.
        if (activityLevels.length === 0) {
            setError("Veuillez lier au moins un niveau à cette activité.");
            return false;
        }

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

            // Envoi au service de sauvegarde (le "cerveau" métier)
            const activityId = await activityService.saveActivity(
                activityData,
                selectedMaterialTypes,
                activityLevels,
                !!activityToEdit
            );

            // Construction d'un objet "fictif" instantané pour mettre à jour l'écran sans attendre le rechargement de la base.
            const optimisticActivity = {
                id: activityId,
                ...activityData,
                created_at: activityToEdit ? activityToEdit.created_at : new Date().toISOString(),
                Module: {
                    id: moduleId,
                    nom: moduleName || '...', 
                    statut: 'en_cours'
                },
                ActiviteNiveau: activityLevels.map(al => ({
                    id: al.id || Math.random().toString(),
                    niveau_id: al.niveau_id,
                    activite_id: activityId!,
                    nombre_exercices: typeof al.nombre_exercices === 'string' ? parseInt(al.nombre_exercices) || 0 : al.nombre_exercices,
                    nombre_erreurs: typeof al.nombre_erreurs === 'string' ? parseInt(al.nombre_erreurs) || 0 : al.nombre_erreurs,
                    statut_exigence: al.statut_exigence,
                    user_id: user.id,
                    created_at: new Date().toISOString(),
                    Niveau: {
                        nom: al.nom_niveau || levels.find(l => l.id === al.niveau_id)?.nom || '...',
                        ordre: levels.find(l => l.id === al.niveau_id)?.ordre || 0
                    }
                })),
                ActiviteMateriel: selectedMaterialTypes.map(mId => ({
                    activite_id: activityId!,
                    type_materiel_id: mId
                }))
            };

            onAdded(optimisticActivity);
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
        // État du formulaire
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

        // Actions (fonctions utilisables par l'interface)
        handleAddLevel,
        handleRemoveLevel,
        updateActivityLevel,
        toggleMaterialType,
        submitForm
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre le formulaire (Ajout ou Édition).
 * 2. Le Hook initialise les champs :
 *    - Mode AJOUT : Champs vides ou valeurs par défaut.
 *    - Mode ÉDITION : Récupération et affichage des données actuelles depuis Supabase.
 * 3. L'enseignant remplit les données :
 *    - Titre, dossier (module), matériel nécessaire.
 *    - Critères de réussite (NB exercices, NB erreurs max).
 * 4. Gestion fine par niveau :
 *    - L'enseignant peut ajouter un niveau (ex: 'GS') pour lui donner des objectifs différents.
 *    - Il peut en ajouter autant qu'il y a de niveaux dans sa base.
 * 5. Lors de la validation (Valider) :
 *    a. Le Hook effectue des contrôles de sécurité (titre présent, au moins un niveau lié).
 *    b. Il prépare les données numériques (conversion de texte en chiffres).
 *    c. Il appelle le service `activityService.saveActivity`.
 *    d. Il prépare un objet "temporaire" (optimiste) pour que l'écran se mette à jour sans attendre.
 *    e. Il ferme le formulaire et confirme le succès à l'écran appelant.
 */
