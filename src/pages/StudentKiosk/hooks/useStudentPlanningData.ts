import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../../lib/database';
import { trackingService } from '../../../features/tracking/services/trackingService';
import { toast } from 'sonner';
import { calculateLuckyStatus } from '../../../lib/helpers/mobileEncodingHelpers';

export type PlanningStatus = 'non_demarre' | 'demarre' | 'fini' | 'corrige' | 'valide';

export interface PlanningChoice {
    activite_id: string;
    jour: string | null;  // 'Lundi' | 'Mardi' | ... | null
    lieu: 'classe' | 'domicile' | null;
    statut: PlanningStatus;
}

export interface PlanningActivity {
    id: string;
    titre: string;
    ordre: number;
    moduleId: string;
    moduleNom: string;
    moduleDateFin: string | null;
    isOverdue: boolean;
    branchId: string | null;
}

/**
 * Hook pour gérer les données de planification du kiosque.
 * Charge les activités de l'élève et gère les choix de planification.
 */
export function useStudentPlanningData(studentId: string | undefined) {
    const [student, setStudent] = useState<any>(null);
    const [activities, setActivities] = useState<PlanningActivity[]>([]);
    const [choices, setChoices] = useState<Record<string, PlanningChoice>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [kioskPlanningOpen, setKioskPlanningOpen] = useState(true);

    // Indices de confiance pour l'auto-vérification
    const [manualIndices, setManualIndices] = useState<Record<string, any>>({});
    const [defaultLuckyIndex, setDefaultLuckyIndex] = useState<number>(50);

    const location = useLocation();
    const token = new URLSearchParams(location.search).get('token');

    // Calculer le lundi de la semaine en cours
    const getMonday = () => {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        return monday.toISOString().split('T')[0];
    };

    const [weekStart] = useState(getMonday());

    useEffect(() => {
        if (studentId) {
            checkPlanningStatus();
            fetchData();
        }
    }, [studentId, token]);

    const checkPlanningStatus = async () => {
        if (!studentId) return;
        try {
            const { data, error } = await supabase.rpc('get_kiosk_planning_status', { p_student_id: studentId });
            if (!error && data !== null) setKioskPlanningOpen(data);
        } catch (e) {
            console.error('Erreur vérification statut planification:', e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Récupérer les infos de l'élève
            let resolvedLevelId: string | null = null;
            let studentData: any = null;
            if (token) {
                const { data: rpcData, error: rpcError } = await supabase.rpc('get_kiosk_student_data', {
                    p_student_id: studentId,
                    p_token: token,
                });
                if (rpcError) throw rpcError;
                studentData = Array.isArray(rpcData) ? rpcData[0]?.student : rpcData?.student;
                if (!studentData) throw new Error('Accès refusé');
                setStudent(studentData);
                resolvedLevelId = studentData.niveau_id;
            } else {
                const { data: sData, error } = await supabase
                    .from('Eleve')
                    .select('*, Niveau(id, nom)')
                    .eq('id', studentId!)
                    .single();
                if (error) throw error;
                studentData = sData;
                setStudent(studentData);
                resolvedLevelId = studentData.niveau_id || null;
            }

            // 2. Préparer les données pour le filtrage et l'affichage
            let progMap: Record<string, string> = {};
            const planActivities: PlanningActivity[] = [];
            const today = new Date();

            // 2.1 Récupérer les progressions
            if (token) {
                const { data: progData, error: progError } = await supabase.rpc('get_kiosk_progressions', {
                    p_student_id: studentId,
                    p_token: token,
                });
                if (!progError && progData) {
                    (progData as any[]).forEach(p => { progMap[p.activite_id] = p.etat; });
                }
            } else {
                progMap = await trackingService.fetchStudentProgressionsMap(studentId!);
            }

            // 2.2 Charger toutes les activités disponibles via Secure RPC ou trackingService
            let fetchedModules = [];
            if (token) {
                const { data: modulesData, error: modulesError } = await supabase.rpc('get_kiosk_modules_activities', {
                    p_student_id: studentId,
                    p_token: token
                });
                if (modulesError) throw modulesError;
                fetchedModules = (modulesData || []) as any[];
            } else {
                fetchedModules = await trackingService.getMobileModules();
            }

            fetchedModules.forEach((mod: any) => {
                const isOverdue = mod.date_fin ? new Date(mod.date_fin) < today : false;
                
                // Pour le kiosque, on ne veut afficher le module QUE SI l'élève 
                // a au moins une activité assignée (présente dans progMap)
                const hasAssignedActivities = (mod.Activite || []).some((act: any) => progMap[act.id] !== undefined);
                
                if (hasAssignedActivities) {
                    (mod.Activite || []).forEach((act: any) => {
                        // Check Level restrictions (Already filtered by RPC in token mode, but keeping for Auth mode)
                        if (!token && resolvedLevelId) {
                            const levels = act.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];
                            if (levels.length > 0 && !levels.includes(resolvedLevelId)) {
                                return; // Skip if student level is not included
                            }
                        }

                        // On ajoute uniquement si l'activité est assignée (dans progMap)
                        if (progMap[act.id] !== undefined) {
                            planActivities.push({
                                id: act.id,
                                titre: act.titre,
                                ordre: act.ordre || 0,
                                moduleId: mod.id,
                                moduleNom: mod.nom || mod.titre,
                                moduleDateFin: mod.date_fin,
                                isOverdue,
                                branchId: mod.SousBranche?.Branche?.id || null
                            });
                        }
                    });
                }
            });

            // 3. Charger la planification existante pour cette semaine
            let planData: any[] = [];
            if (token) {
                const { data, error } = await supabase.rpc('get_kiosk_planification', {
                    p_student_id: studentId,
                    p_token: token,
                    p_semaine_debut: weekStart,
                });
                if (!error && data) planData = data;
            } else {
                const { data } = await supabase
                    .from('PlanificationHebdo')
                    .select('activite_id, jour, lieu, statut')
                    .eq('eleve_id', studentId!)
                    .eq('semaine_debut', weekStart);
                if (data) planData = data;
            }

            const choicesMap: Record<string, PlanningChoice> = {};
            const plannedIds = new Set<string>();

            planData.forEach(p => {
                plannedIds.add(p.activite_id);
                choicesMap[p.activite_id] = {
                    activite_id: p.activite_id,
                    jour: p.jour,
                    lieu: p.lieu as 'classe' | 'domicile',
                    statut: (p.statut || 'non_demarre') as PlanningStatus,
                };
            });

            // 4. Filtrer les activités : montrer uniquement les assignées (avec une progression) non terminées OU celles déjà planifiées cette semaine
            const filteredActivities = planActivities.filter(act => {
                const status = progMap[act.id];
                const isPlannedThisWeek = plannedIds.has(act.id);
                
                // Ne garder que si l'élève a une progression (donc assignée) ou s'il l'a déjà planifiée
                if (!status && !isPlannedThisWeek) return false;

                // On garde si planifié OU si pas fini/à vérifier
                return isPlannedThisWeek || (status !== 'termine' && status !== 'a_verifier');
            });

            // Re-render guards
            if (JSON.stringify(filteredActivities) !== JSON.stringify(activities)) {
                setActivities(filteredActivities);
            }
            if (JSON.stringify(choicesMap) !== JSON.stringify(choices)) {
                setChoices(choicesMap);
            }

            // 5. Charger les préférences de confiance (indices)
            const teacherId = studentData.user_id;
            if (teacherId) {
                try {
                    const { data: prefData } = await supabase
                        .from('UserPreference')
                        .select('key, value')
                        .eq('user_id', teacherId)
                        .in('key', ['eleve_profil_competences', 'default_lucky_check_index']);
                    
                    if (prefData) {
                        const indicesPref = prefData.find(p => p.key === 'eleve_profil_competences');
                        if (indicesPref) setManualIndices(indicesPref.value as any);

                        const defaultIdxPref = prefData.find(p => p.key === 'default_lucky_check_index');
                        if (defaultIdxPref) setDefaultLuckyIndex(Number(defaultIdxPref.value));
                    }
                } catch (e) {
                    console.warn('Impossible de charger les indices de confiance:', e);
                }
            }

        } catch (err) {
            console.error('Erreur chargement planification:', err);
            toast.error("Erreur d'accès aux données de planification");
        } finally {
            setLoading(false);
        }
    };

    // Mettre à jour un choix (jour + lieu)
    const setChoice = (activityId: string, jour: string | null, lieu: 'classe' | 'domicile' | null) => {
        setChoices(prev => {
            const current = prev[activityId];
            const isSelected = current?.jour === jour && jour !== null;
            // Si on clique sur le même jour → désélectionner
            const updatedChoices = isSelected
                ? (() => { const { [activityId]: _, ...rest } = prev; return rest; })()
                : {
                    ...prev,
                    [activityId]: { 
                        activite_id: activityId, 
                        jour, 
                        lieu, 
                        statut: current?.statut || 'non_demarre' 
                    },
                };
            
            savePlanification(updatedChoices, true);
            return updatedChoices;
        });
    };

    // Alterner le lieu pour un exercice (classe ↔ domicile)
    const toggleLieu = (activityId: string, jour: string) => {
        setChoices(prev => {
            const current = prev[activityId];
            let updatedChoices: Record<string, PlanningChoice>;
            if (current?.jour === jour) {
                // Alterner : classe → domicile → vide
                if (current.lieu === 'classe') {
                    updatedChoices = { ...prev, [activityId]: { ...current, lieu: 'domicile' } };
                } else {
                    const { [activityId]: _, ...rest } = prev;
                    updatedChoices = rest;
                }
            } else {
                // Nouveau choix : par défaut en classe
                updatedChoices = {
                    ...prev,
                    [activityId]: { 
                        activite_id: activityId, 
                        jour, 
                        lieu: 'classe',
                        statut: current?.statut || 'non_demarre'
                    },
                };
            }

            savePlanification(updatedChoices, true);
            return updatedChoices;
        });
    };

    // Nouveau : basculer le statut
    const toggleStatut = (activityId: string, targetStatut: PlanningStatus) => {
        setChoices(prev => {
            const current = prev[activityId];
            
            // Si on clique sur le statut déjà actif -> on reset tout
            if (current?.statut === targetStatut) {
                const updatedChoices = {
                    ...prev,
                    [activityId]: {
                        activite_id: activityId,
                        jour: null,
                        lieu: null,
                        statut: 'non_demarre' as PlanningStatus
                    }
                };
                savePlanification(updatedChoices, true);
                return updatedChoices;
            }

            const newStatut = targetStatut;
            
            // Logique de lieu basée sur le statut (seulement si lieu n'est pas déjà défini ?)
            // On enforce le lieu lors du changement de statut pour guider l'élève
            let newLieu = current?.lieu || null;

            if (newStatut === 'fini') {
                newLieu = 'classe';
            } else if (newStatut === 'demarre' || newStatut === 'corrige') {
                newLieu = 'domicile';
            }
            // On ne touche pas à newLieu si newStatut === 'valide' ou 'non_demarre'
            // Cela permet de garder le choix précédent si on revient en arrière.

            const updatedChoices = {
                ...prev,
                [activityId]: {
                    activite_id: activityId,
                    jour: current?.jour || null,
                    lieu: newLieu,
                    statut: newStatut
                }
            };
            
            // Sauvegarde automatique en arrière-plan pour l'Étape 1
            savePlanification(updatedChoices, true);

            return updatedChoices;
        });
    };

    // Sauvegarder la planification complète
    const savePlanification = async (choicesOverride?: Record<string, PlanningChoice>, silent = false): Promise<boolean> => {
        if (!studentId) return false;
        const currentChoices = choicesOverride || choices;
        if (!silent) setSaving(true);
        try {
            const items = Object.values(currentChoices)
                .filter(c => (c.jour && c.lieu) || c.statut !== 'non_demarre')
                .map(c => ({
                    activite_id: c.activite_id,
                    jour: c.jour || 'Lundi', 
                    lieu: c.lieu || 'classe',
                    statut: c.statut,
                }));

            if (token) {
                const { error } = await supabase.rpc('upsert_kiosk_planification', {
                    p_student_id: studentId,
                    p_token: token,
                    p_semaine_debut: weekStart,
                    p_items: items,
                });
                if (error) throw error;

                // Mettre à jour les progressions réelles via RPC (uniquement si NON silencieux = Validation Finale)
                if (!silent) {
                    for (const choice of Object.values(currentChoices)) {
                    let nextEtat = '';
                    if (choice.statut === 'demarre') nextEtat = 'en_cours';
                    else if (choice.statut === 'fini') nextEtat = 'a_verifier';

                    if (nextEtat) {
                        await supabase.rpc('update_kiosk_progression', {
                            p_student_id: studentId,
                            p_token: token,
                            p_activity_id: choice.activite_id,
                            p_status: nextEtat
                        });
                    }
                    }
                }
            } else {
                // Mode authentifié
                await supabase
                    .from('PlanificationHebdo')
                    .delete()
                    .eq('eleve_id', studentId)
                    .eq('semaine_debut', weekStart);

                if (items.length > 0) {
                    const { error } = await supabase
                        .from('PlanificationHebdo')
                        .insert(items.map(item => ({
                            eleve_id: studentId,
                            activite_id: item.activite_id,
                            semaine_debut: weekStart,
                            jour: item.jour,
                            lieu: item.lieu,
                            statut: item.statut
                        })));
                    if (error) throw error;
                }

                // Mettre à jour les progressions réelles (uniquement si NON silencieux = Validation Finale)
                if (!silent) {
                    for (const choice of Object.values(currentChoices)) {
                    let nextEtat = '';
                    if (choice.statut === 'demarre') nextEtat = 'en_cours';
                    else if (choice.statut === 'fini') nextEtat = 'a_verifier';

                    if (nextEtat) {
                        await trackingService.upsertProgression({
                            eleve_id: studentId,
                            activite_id: choice.activite_id,
                            etat: nextEtat,
                            updated_at: new Date().toISOString()
                        });
                    }
                    }
                }
            }

            if (!silent) toast.success('Planification enregistrée !');
            return true;
        } catch (err) {
            console.error('Erreur sauvegarde planification:', err);
            if (!silent) toast.error('Erreur lors de la sauvegarde');
            return false;
        } finally {
            if (!silent) setSaving(false);
        }
    };

    // Nouveau : Valider les activités de l'Etape 1 (4 carrés)
    const processStep1Validations = async (): Promise<{ title: string, status: 'termine' | 'a_verifier' }[]> => {
        if (!studentId) return [];
        const results: { title: string, status: 'termine' | 'a_verifier' }[] = [];
        const validatedActivityIds: string[] = [];

        try {
            // On prépare une copie des choix pour nettoyer la planification des activités validées
            const updatedChoices = { ...choices };

            for (const choice of Object.values(choices)) {
                if (choice.statut === 'valide') {
                    const act = activities.find(a => a.id === choice.activite_id);
                    if (!act) continue;

                    let nextEtat: 'termine' | 'a_verifier' = 'termine';
                    
                    // LOGIQUE D'AUTO-VERIFICATION
                    const lucky = calculateLuckyStatus({
                        studentId: studentId!,
                        branchId: act.branchId,
                        studentName: `${student?.prenom} ${student?.nom}`,
                        activityTitle: act.titre,
                        studentGlobalIndex: student?.importance_suivi,
                        manualIndices,
                        defaultLuckyIndex
                    });

                    nextEtat = lucky.status;

                    // Mise à jour en base
                    if (token) {
                        await supabase.rpc('update_kiosk_progression', {
                            p_student_id: studentId,
                            p_token: token,
                            p_activity_id: choice.activite_id,
                            p_status: nextEtat
                        });
                    } else {
                        await trackingService.upsertProgression({
                            eleve_id: studentId,
                            activite_id: choice.activite_id,
                            etat: nextEtat,
                            updated_at: new Date().toISOString()
                        });
                    }

                    results.push({ title: act.titre, status: nextEtat });
                    validatedActivityIds.push(choice.activite_id);

                    // --- NETTOYAGE ---
                    // Une fois validée, l'activité ne fait plus partie du "plan de la semaine" 
                    // (elle est terminée ou à vérifier), donc on la retire des choix.
                    delete updatedChoices[choice.activite_id];
                }
            }

            if (results.length > 0) {
                // Mettre à jour les choix localement (retrait des activités validées)
                setChoices(updatedChoices);
                // Sauvegarder la planification (cela supprimera les lignes correspondantes dans PlanificationHebdo)
                await savePlanification(updatedChoices, true);
                // Rafraîchir les données pour masquer les activités validées (termine/a_verifier)
                await fetchData();
            }

            return results;
        } catch (err) {
            console.error('Erreur lors de la validation Etape 1:', err);
            toast.error('Erreur lors de la validation des activités');
            return [];
        }
    };

    // Données dérivées : on masque globalement toutes les activités avec le statut 'valide' (comme sur la to-do liste papier)
    const activeActivities = activities; // On ne masque plus les 'valide' ici pour les garder en Phase 1
    const overdueActivitiesRaw = activeActivities.filter(a => a.isOverdue);
    const weekActivitiesRaw = activeActivities.filter(a => !a.isOverdue);

    // Séparation spécifique pour les 4 étapes :
    // - Étape 1 (Évolution) affiche TOUT (overdueModules, weekModules)
    // - Étape 2 (Devoirs) affiche UNIQUEMENT les retards à 0 ou 1 carré
    // - Étape 3 (Semaine) affiche UNIQUEMENT la semaine EN COURS + les retards à 2 ou 3 carrés
    const homeworkActivities = overdueActivitiesRaw.filter(a => {
        const statut = choices[a.id]?.statut || 'non_demarre';
        return statut === 'non_demarre' || statut === 'demarre'; // 0 ou 1 carré
    });

    const weekworkActivities = [
        ...weekActivitiesRaw.filter(a => choices[a.id]?.statut !== 'valide'),
        ...overdueActivitiesRaw.filter(a => {
            const statut = choices[a.id]?.statut || 'non_demarre';
            return statut === 'fini' || statut === 'corrige'; // 2 ou 3 carrés
        })
    ];

    // Grouper par module
    const groupByModule = (acts: PlanningActivity[]) => {
        const groups: Record<string, { moduleNom: string; moduleDateFin: string | null; activities: PlanningActivity[] }> = {};
        acts.forEach(a => {
            if (!groups[a.moduleId]) {
                groups[a.moduleId] = { moduleNom: a.moduleNom, moduleDateFin: a.moduleDateFin, activities: [] };
            }
            groups[a.moduleId].activities.push(a);
        });
        // Trier les activités par ordre dans chaque module
        Object.values(groups).forEach(g => g.activities.sort((a, b) => a.ordre - b.ordre));
        return Object.values(groups);
    };

    return {
        student,
        loading,
        saving,
        kioskPlanningOpen,
        weekStart,
        choices,
        overdueActivities: overdueActivitiesRaw,
        weekActivities: weekActivitiesRaw,
        homeworkActivities,
        weekworkActivities,
        overdueModules: groupByModule(overdueActivitiesRaw),
        weekModules: groupByModule(weekActivitiesRaw),
        homeworkModules: groupByModule(homeworkActivities),
        weekworkModules: groupByModule(weekworkActivities),
        setChoice,
        toggleLieu,
        toggleStatut,
        savePlanification,
        processStep1Validations,
        refresh: fetchData,
    };
}
