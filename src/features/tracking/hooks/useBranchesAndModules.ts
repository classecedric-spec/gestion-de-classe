/**
 * Nom du module/fichier : useBranchesAndModules.ts
 * 
 * Données en entrée : 
 *   - `selectedStudent` : L'élève pour lequel on veut voir les leçons.
 *   - `showPendingOnly` : Filtre pour cacher les exercices déjà terminés.
 *   - `selectedGroupId`, `groupStudents` : La classe et ses élèves.
 * 
 * Données en sortie : 
 *   - `branches` : Liste des matières (ex: Français, Maths).
 *   - `modules` : Liste des chapitres ou leçons (ex: Les fractions, Le passé composé).
 *   - `activities` : Liste des exercices précis à l'intérieur d'un chapitre.
 *   - `groupedProgressions` : Statistiques de réussite pour chaque élève et chaque matière.
 * 
 * Objectif principal : Gérer la "Bibliothèque" d'exercices d'un élève ou d'une classe. Ce hook s'occupe de filtrer intelligemment les leçons pour ne montrer que ce qui est pertinent (par exemple, ne montrer que les exercices du niveau CP si l'élève est en CP, et seulement ceux qu'il a déjà commencés ou qui lui sont assignés). Il calcule aussi les pourcentages de réussite pour afficher les barres de progression.
 * 
 * Ce que ça contient : 
 *   - Le chargement des matières et des modules depuis le serveur.
 *   - Le calcul des statistiques de réussite (ex: "8 exercices sur 10 validés").
 *   - Le tri automatique des leçons par date de fin et par ordre pédagogique.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { fetchWithCache } from '../../../lib/sync';
import { Student } from '../../attendance/services/attendanceService';
import { branchService } from '../../branches/services/branchService';
import { trackingService } from '../services/trackingService';

export interface Branch {
    id: string;
    nom: string;
    ordre?: number | null;
}

/** 
 * Module de leçon enrichi avec des outils de calcul de progression.
 */
export interface ModuleWithStats {
    id: string;
    nom: string;
    date_fin: string | null;
    sous_branche_id: string | null;
    statut: string | null;
    SousBranche?: {
        nom: string;
        ordre: number | null;
        Branche?: {
            nom: string;
            ordre: number | null;
        } | null;
    } | null;
    totalActivities: number;
    completedActivities: number;
    toVerifyActivities: number;
    percent: number; // Score de réussite (ex: 85%)
    Activite?: any[];
}

export interface Activity {
    id: string;
    titre: string;
    ordre: number | null;
    nombre_exercices: number | null;
    nombre_erreurs: number | null;
    statut_exigence: string | null;
    module_id: string | null;
    ActiviteNiveau?: { niveau_id: string }[];
    Module?: {
        id: string;
        nom: string;
        SousBranche?: {
            id: string;
            Branche?: {
                id: string;
            } | null;
        } | null;
    } | null;
    ActiviteMateriel?: {
        TypeMateriel?: {
            acronyme: string | null;
        } | null;
    }[];
}

/**
 * Hook de gestion des matières, leçons (modules) et exercices.
 */
export function useBranchesAndModules(
    selectedStudent: Student | null,
    showPendingOnly: boolean,
    selectedGroupId: string | null,
    groupStudents: Student[] = []
) {
    // ÉTATS : Matières et statistiques globales
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranchForSuivi, setSelectedBranchForSuivi] = useState<string>('global');
    const [groupedProgressions, setGroupedProgressions] = useState<Record<string, Record<string, { total: number; done: number }>>>({});

    // ÉTATS : Chapitres (Modules)
    const [modules, setModules] = useState<ModuleWithStats[]>([]);
    const [selectedModule, setSelectedModule] = useState<ModuleWithStats | null>(null);
    const [loadingModules, setLoadingModules] = useState(false);

    // ÉTATS : Exercices précis (Activités)
    const [activities, setActivities] = useState<Activity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    /** 
     * CHARGEMENT DES MATIÈRES : 
     * On récupère la liste (Français, Maths, Éveil, etc.).
     */
    const fetchBranches = async () => {
        await fetchWithCache(
            'branches',
            async () => {
                return await branchService.fetchBranches();
            },
            setBranches
        );
    };

    /** 
     * STATISTIQUES DE GROUPE : 
     * Calcule combien d'exercices chaque élève a fini dans chaque matière.
     * C'est ce qui permet d'afficher les petits indicateurs sous chaque portrait d'élève.
     */
    const fetchGroupProgressions = async (groupId: string) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        await fetchWithCache(
            `group_progressions_${groupId}`,
            async () => {
                const allStudents = await trackingService.fetchStudentsInGroup(groupId, user.id);
                const result = await trackingService.fetchGroupProgressions(allStudents.ids, user.id);
                return result || [];
            },
            (rawData: any[]) => {
                const map: Record<string, Record<string, { total: number; done: number }>> = {};
                rawData.forEach(p => {
                    const sId = p.eleve_id;
                    const bId = p.Activite?.Module?.SousBranche?.branche_id;

                    if (!sId || !bId) return;

                    if (!map[sId]) map[sId] = {};
                    if (!map[sId][bId]) map[sId][bId] = { total: 0, done: 0 };

                    map[sId][bId].total++;
                    if (p.etat === 'termine' || p.etat === 'a_verifier') map[sId][bId].done++;
                });
                setGroupedProgressions(map);
            },
            (_err) => { }
        );
    };

    /** 
     * CHARGEMENT ET FILTRAGE DES LEÇONS : 
     * C'est ici qu'on décide quoi montrer à l'écran. 
     */
    const fetchModules = async (studentId: string | null) => {
        setLoadingModules(true);

        await fetchWithCache(
            `modules_pedago_${studentId || selectedGroupId}`,
            async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return [];
                const modules = await trackingService.fetchModulesForStudent(null, user.id);
                return modules || [];
            },
            (data: any[]) => {
                const modulesWithStats: ModuleWithStats[] = (data || []).map(m => {
                    // Si on regarde la fiche d'un élève précis :
                    if (studentId) {
                        const studentLevelId = selectedStudent?.niveau_id;
                        const validActivities = m.Activite?.filter((act: any) => {
                            // On filtre selon le niveau (CP/CE1/etc)
                            if (studentLevelId) {
                                const levels = act.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];
                                if (levels.length > 0 && !levels.includes(studentLevelId)) return false;
                            }
                            // On ne montre que s'il y a une progression enregistrée
                            const hasProgression = act.Progression?.some((p: any) => p.eleve_id === studentId);
                            if (!hasProgression) return false;
                            return true;
                        }) || [];

                        const totalActivities = validActivities.length;
                        const completedActivities = validActivities.filter((act: any) =>
                            act.Progression?.some((p: any) => p.eleve_id === studentId && p.etat === 'termine')
                        ).length;
                        const toVerifyActivities = validActivities.filter((act: any) =>
                            act.Progression?.some((p: any) => p.eleve_id === studentId && p.etat === 'a_verifier')
                        ).length;

                        return {
                            ...m,
                            totalActivities,
                            completedActivities,
                            toVerifyActivities,
                            percent: totalActivities > 0 ? Math.round(((completedActivities + toVerifyActivities) / totalActivities) * 100) : 0
                        };
                    } else {
                        // Si on est sur la vue "Classe entière", on cherche les modules pertinents pour le groupe.
                        let totalActs = 0;
                        let keepModule = false;
                        if (selectedGroupId && groupStudents && groupStudents.length > 0) {
                            const groupStudentIds = groupStudents.map(s => s.id);
                            m.Activite?.forEach((act: any) => {
                                const pgs = act.Progression || [];
                                pgs.forEach((p: any) => {
                                    if (groupStudentIds.includes(p.eleve_id)) keepModule = true;
                                });
                            });
                        }
                        if (keepModule) totalActs = 1;

                        return { ...m, totalActivities: totalActs, completedActivities: 0, toVerifyActivities: 0, percent: 0 };
                    }
                });

                // Optionnel : On cache les leçons où l'élève a déjà 100% de réussite si le mode "Pending Only" est activé.
                const filteredByCompletion = modulesWithStats.filter((m: any) => {
                    if (m.totalActivities === 0) return false;
                    if (showPendingOnly) return m.completedActivities < m.totalActivities;
                    return true;
                });

                // TRI FINAL : On range par date d'échéance, puis par matière, puis par ordre alphabétique.
                const sortedModules = filteredByCompletion.sort((a: any, b: any) => {
                    if (a.date_fin !== b.date_fin) {
                        if (!a.date_fin) return 1;
                        if (!b.date_fin) return -1;
                        return a.date_fin.localeCompare(b.date_fin);
                    }
                    const aB = a.SousBranche?.Branche;
                    const bB = b.SousBranche?.Branche;
                    if (aB?.ordre !== bB?.ordre) return (aB?.ordre || 0) - (bB?.ordre || 0);
                    const aSB = a.SousBranche;
                    const bSB = b.SousBranche;
                    if (aSB?.ordre !== bSB?.ordre) return (aSB?.ordre || 0) - (bSB?.ordre || 0);
                    return a.nom.localeCompare(b.nom);
                });

                setModules(sortedModules);
                setLoadingModules(false);
            },
            (_err: any) => { setLoadingModules(false); }
        );
    };

    /** 
     * CHARGEMENT DES EXERCICES : 
     * Une fois qu'un chapitre (Module) est choisi, on récupère ses exercices.
     */
    const fetchActivities = async (moduleId: string) => {
        setLoadingActivities(true);
        await fetchWithCache(
            `activities_pedago_${moduleId}`,
            async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return [];
                return await trackingService.fetchActivitiesForModule(moduleId, user.id);
            },
            (data: any[]) => {
                const filteredData = selectedStudent ? data.filter((act) => {
                    const studentLevelId = selectedStudent.niveau_id;
                    if (studentLevelId) {
                        const levels = act.ActiviteNiveau?.map((an: any) => an.niveau_id) || [];
                        if (levels.length > 0 && !levels.includes(studentLevelId)) return false;
                    }
                    const hasProgression = act.Progression?.some((p: any) => p.eleve_id === selectedStudent.id);
                    return hasProgression;
                }) : data;

                setActivities(filteredData as Activity[]);
                setLoadingActivities(false);
            },
            (_err) => { setLoadingActivities(false); }
        );
    };

    // Déclenchements automatiques lors des changements d'état (Effets de bord)
    useEffect(() => { fetchBranches(); }, []);
    useEffect(() => { if (selectedGroupId) fetchGroupProgressions(selectedGroupId); }, [selectedGroupId]);

    useEffect(() => {
        if (selectedStudent) {
            fetchModules(selectedStudent.id);
            setSelectedModule(null);
            setActivities([]);
        } else if (selectedGroupId && groupStudents.length > 0) {
            fetchModules(null);
            setSelectedModule(null);
            setActivities([]);
        } else if (!selectedGroupId) {
            setModules([]);
            setSelectedModule(null);
            setActivities([]);
        }
    }, [selectedStudent, selectedGroupId, showPendingOnly, groupStudents]);

    useEffect(() => { if (selectedModule) fetchActivities(selectedModule.id); }, [selectedModule]);

    return {
        states: { branches, selectedBranchForSuivi, modules, selectedModule, activities, loadingModules, loadingActivities, groupedProgressions },
        actions: { setSelectedBranchForSuivi, setSelectedModule, setActivities }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ARRIVÉE : L'enseignant choisit Lucas sur son écran.
 * 2. ACTION : Le hook `useBranchesAndModules` détecte ce choix.
 * 3. SCAN : Il demande la liste de tous les exercices de la classe.
 * 4. FILTRAGE : Il remarque que Lucas est en CM1. Il supprime de l'affichage tous les exercices de CM2.
 * 5. CALCUL : Il voit que Lucas a 12 exercices de Français en cours. Il regarde ses notes et calcule qu'il a réussi 6 exercices.
 * 6. RÉSULTAT : Le dashboard affiche une barre de progression à 50% pour le module de Français de Lucas.
 * 7. SELECTION : L'enseignant clique sur "Grammaire". Le hook télécharge alors les 12 exercices précis pour que l'enseignant puisse les valider un par un.
 */
