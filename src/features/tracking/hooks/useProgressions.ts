/**
 * Nom du module/fichier : useProgressions.ts
 * 
 * Données en entrée : 
 *   - `selectedStudent`, `students` : L'élève sur lequel on travaille et ses camarades.
 *   - `activities` : Les exercices disponibles.
 *   - `manualIndices` : Réglages de "confiance" personnalisés par l'enseignant.
 *   - `rotationSkips` : Mémoire du passage des élèves pour ne pas toujours interroger les mêmes.
 *   - `groupedProgressions` : Statistiques de réussite par élève.
 * 
 * Données en sortie : 
 *   - Un objet contenant l'état des exercices de l'élève actuel.
 *   - `handleStatusClick` : La fonction magique qui valide un exercice.
 *   - `handleAddStudentsForSuivi` : La fonction qui choisit 3 élèves prioritaires ("La Main de l'Adulte").
 * 
 * Objectif principal : C'est le "Chef d'Orchestre" de la validation pédagogique. Ce hook gère non seulement l'enregistrement des réussites, mais il injecte aussi de l'Intelligence Artificielle pédagogique. Par exemple, il décide si un exercice doit être vérifié par l'adulte (en fonction d'un tirage aléatoire basé sur la confiance) et il ajuste automatiquement le score de l'élève en fonction de ses succès réels.
 * 
 * Ce que ça contient : 
 *   - La logique d'auto-vérification (le fameux petit badge violet 🟣).
 *   - L'algorithme de tirage au sort intelligent pour le suivi personnalisé.
 *   - La synchronisation en temps réel avec la base de données Supabase.
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { fetchWithCache } from '../../../lib/sync';
import { useUpdateProgression } from '../../../hooks/useUpdateProgression';
import { toast } from 'sonner';
import { Student } from '../../attendance/services/attendanceService';
import { Activity } from './useBranchesAndModules';
import { trackingService } from '../services/trackingService';

/**
 * Hook de gestion des progressions élèves (Dashboard principal).
 */
export function useProgressions(
    selectedStudent: Student | null,
    students: Student[],
    selectedGroupId: string | null,
    activities: Activity[],
    manualIndices: Record<string, any>,
    rotationSkips: Record<string, any>,
    setRotationSkips: React.Dispatch<React.SetStateAction<Record<string, any>>>,
    groupedProgressions: Record<string, Record<string, { total: number; done: number }>>,
    selectedBranchForSuivi: string,
    fetchHelpRequests?: () => void,
    defaultLuckyCheckIndex?: number
) {
    const { updateProgression } = useUpdateProgression();

    const [progressions, setProgressions] = useState<Record<string, string>>({});
    const [itemToDelete, setItemToDelete] = useState<any | null>(null);

    /** 
     * CHARGEMENT : 
     * Récupère l'état de tous les exercices pour l'élève sélectionné.
     */
    const fetchStudentProgressions = async (studentId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await fetchWithCache(
            `progressions_pedago_${studentId}`,
            async () => {
                return await trackingService.fetchStudentProgressionsMap(studentId, user.id);
            },
            (data: any) => {
                setProgressions(data);
            },
            (_err) => { }
        );
    };

    /** 
     * ACTION DE VALIDATION : 
     * C'est ici que l'enseignant clique sur "Valider".
     * Le logiciel applique alors la règle d'auto-vérification.
     */
    const handleStatusClick = useCallback(async (
        activityId: string,
        newStatus: string,
        currentStatus: string, 
        specificStudentId: string | null = null,
        explicitBranchId: string | null = null
    ) => {
        const targetStudentId = specificStudentId || selectedStudent?.id;
        if (!targetStudentId) return;

        let finalStatus = newStatus;

        /** 
         * LOGIQUE D'AUTO-VÉRIFICATION (Le "Tirage au Sort") :
         * Si l'élève veut finir ('termine'), on lance un dé virtuel.
         * Si le dé est mauvais, l'exercice passe en 'À vérifier' (violet) au lieu de 'Terminé' (vert).
         */
        if (finalStatus === 'termine') {
            let branchId = explicitBranchId;

            if (!branchId) {
                const act = activities.find(a => a.id === activityId);
                if (act) branchId = act.Module?.SousBranche?.Branche?.id || null;
            }

            if (branchId) {
                const specificIdx = manualIndices[targetStudentId]?.[branchId];
                const studentGlobalIdx = selectedStudent?.importance_suivi;

                // On cherche l'indice de confiance : d'abord la matière, puis l'élève, puis le réglage par défaut (50%).
                const idx = specificIdx ?? studentGlobalIdx ?? defaultLuckyCheckIndex ?? 50;
                const randomRoll = Math.random() * 100;
                const willVerify = randomRoll < idx;

                const targetStudent = students.find(s => s.id === targetStudentId);
                const act = activities.find(a => a.id === activityId);

                // Logs pédagogiques pour comprendre la décision du logiciel
                console.log(`[Dashboard] ${targetStudent?.prenom} ${targetStudent?.nom} | Module: ${act?.Module?.nom} | Activité: ${act?.titre}`);
                console.log(`- Indice appliqué : ${idx}% | Tirage: ${randomRoll.toFixed(2)}% | Décision: ${willVerify ? 'À VÉRIFIER 🟣' : 'TERMINÉ 🟢'}`);

                if (willVerify) {
                    finalStatus = 'a_verifier';
                    toast("Vérification requise (Auto)", { description: "L'activité doit être vérifiée.", duration: 4000 });
                }
            }
        }

        /** 
         * APPRENTISSAGE DE LA CONFIANCE : 
         * Si l'adulte valide une demande "À vérifier", le logiciel augmente la confiance (l'indice baisse de -2%).
         * Si l'adulte rejette la demande, la confiance diminue car l'élève a essayé de "tricailler" (+5% de chances de contrôle).
         */
        if (currentStatus === 'a_verifier') {
            const act = activities.find(a => a.id === activityId);
            const branchId = act?.Module?.SousBranche?.Branche?.id;

            if (branchId) {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    if (finalStatus === 'termine') {
                        trackingService.updateStudentTrust(targetStudentId, branchId, -2, 'up', user.id);
                        toast.success("Confiance augmentée (-2%)");
                    } else if (finalStatus === 'a_commencer') {
                        trackingService.updateStudentTrust(targetStudentId, branchId, 5, 'down', user.id);
                        toast.error("Confiance diminuée (+5%)");
                    }
                }
            }
        }

        const effectiveCurrentStatus = currentStatus || 'a_commencer';

        // Envoi de l'ordre final à la base de données.
        await updateProgression(targetStudentId, activityId, effectiveCurrentStatus, {
            explicitNextStatus: finalStatus,
            onOptimisticUpdate: (status) => {
                if (targetStudentId === selectedStudent?.id) {
                    setProgressions(prev => ({ ...prev, [activityId]: status }));
                }
            },
            onRevert: async () => {
                if (targetStudentId === selectedStudent?.id) {
                    fetchStudentProgressions(targetStudentId);
                }
            },
            onSuccess: fetchHelpRequests
        });
    }, [selectedStudent, activities, manualIndices, updateProgression, fetchHelpRequests]);

    /** 
     * TIRAGE "LA MAIN DE L'ADULTE" : 
     * Algorithme qui choisit 3 élèves prioritaires pour un suivi personnalisé.
     * Le calcul mélange : au hasard, besoins de l'élève (PPRE), et retard accumulé dans la matière.
     */
    const handleAddStudentsForSuivi = async () => {
        if (!students.length || !selectedGroupId) return;

        const currentGroupSkips = rotationSkips[selectedGroupId] || {};
        // On évite ceux qui ont déjà été vus récemment (skips).
        const eligiblePool = students.filter(s => !(currentGroupSkips[s.id] > 0));
        const targets = eligiblePool.length > 0 ? eligiblePool : students;

        const candidates = targets.map(s => {
            let performanceMultiplier = 0;
            const sStats = groupedProgressions[s.id] || {};

            // Calcul du "Poids" de l'élève (plus il est en retard, plus il a de chances de sortir).
            if (selectedBranchForSuivi === 'global') {
                let maxDeficit = 0;
                Object.values(sStats).forEach(stat => {
                    if (stat.total > 0) {
                        const deficit = 1 - (stat.done / stat.total);
                        if (deficit > maxDeficit) maxDeficit = deficit;
                    }
                });
                performanceMultiplier = maxDeficit;
            } else {
                const stat = sStats[selectedBranchForSuivi];
                performanceMultiplier = (stat && stat.total > 0) ? (1 - (stat.done / stat.total)) : 0.5;
            }

            const baseImp = (s as any).importance_suivi !== null ? (s as any).importance_suivi : 50;
            const weight = baseImp * (1 + (2 * performanceMultiplier));

            return { ...s, score: Math.random() * weight };
        })
            .sort((a: any, b: any) => b.score - a.score)
            .slice(0, 3);

        const { data: { user } } = await supabase.auth.getUser();

        // On enregistre qu'on vient de voir ces 3 là (ils ne ressortirons pas pendant 2 tirages).
        const selectedIds = new Set(candidates.map(c => c.id));
        const newRotationSkips = { ...rotationSkips };

        students.forEach(s => {
            if (selectedIds.has(s.id)) {
                const theirGroups = (s as any).EleveGroupe?.map((eg: any) => eg.groupe_id) || [selectedGroupId];
                theirGroups.forEach((gId: string) => {
                    newRotationSkips[gId] = { ...(newRotationSkips[gId] || {}), [s.id]: 2 };
                });
            } else {
                const currentVal = newRotationSkips[selectedGroupId]?.[s.id] || 0;
                if (currentVal > 0) {
                    newRotationSkips[selectedGroupId] = { ...newRotationSkips[selectedGroupId], [s.id]: currentVal - 1 };
                }
            }
        });

        setRotationSkips(newRotationSkips);
        if (user) await trackingService.saveUserPreference(user.id, 'suivi_rotation_skips', newRotationSkips);

        // Création des tickets d'aide forcés ("is_suivi: true").
        const newProgs = candidates.map(student => ({
            eleve_id: student.id,
            activite_id: null as unknown as string,
            etat: 'besoin_d_aide',
            is_suivi: true,
            user_id: user?.id,
            updated_at: new Date().toISOString()
        }));

        if (user) await trackingService.createProgressions(newProgs, user.id);
        toast.success("3 élèves ajoutés au suivi personnalisé");
        if (fetchHelpRequests) fetchHelpRequests();
    };

    const handleDeleteSuivi = async () => {
        if (!itemToDelete) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non authentifié.");
            await trackingService.deleteProgression(itemToDelete.id, user.id);
            toast.success("Élève retiré du suivi");
            setItemToDelete(null);
            if (fetchHelpRequests) fetchHelpRequests();
        } catch (err) {
            toast.error("Erreur lors de la suppression");
        }
    };

    return {
        states: { progressions, itemToDelete },
        actions: { handleStatusClick, handleAddStudentsForSuivi, handleDeleteSuivi, setItemToDelete, fetchStudentProgressions }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant veut faire passer 3 élèves à son bureau. Il clique sur "La Main Innocente".
 * 2. CALCUL : Le hook regarde quels élèves ont besoin d'attention prioritaire (ex: Lucas a un PAP et il est en retard en Français).
 * 3. TIRAGE : Le logiciel sort 3 noms : Lucas, Julie, et Bastien.
 * 4. ENREGISTREMENT : Le logiciel crée 3 tickets orange dans la colonne "Aide" et note que ces élèves ne doivent pas être "tirés au sort" lors du prochain clic.
 * 5. SEANCE : L'enseignant voit Lucas. Lucas a tout compris. L'enseignant valide.
 * 6. APPRENTISSAGE : Le logiciel remarque que c'était facile pour Lucas, et baisse son indice de contrôle pour la prochaine fois.
 */
