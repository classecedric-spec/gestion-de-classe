/**
 * Nom du module/fichier : useAttendance.ts
 * 
 * Données en entrée : 
 *   - L'état local de la page (date sélectionnée, période du matin ou après-midi).
 *   - Les données provenant de Supabase (élèves, groupes, catégories de présence).
 * 
 * Données en sortie : 
 *   - Une interface de programmation (API) complète pour la page de présence.
 *   - Fonctions de déplacement d'élèves (`moveStudent`).
 *   - Fonctions de marquage en masse (`markUnassignedAbsent`).
 *   - État de chargement et verrouillage de la configuration.
 * 
 * Objectif principal : Ce "Hook" est le chef d'orchestre de la fonctionnalité Présence. Il centralise toute la logique métier : chargement des données, synchronisation avec la base de données après chaque déplacement d'élève, et gestion des préférences de l'enseignant (se souvenir de la dernière classe ouverte). Il garantit que l'interface reste réactive grâce à des "mises à jour optimistes" (on change l'UI avant même que le serveur n'ait répondu).
 */

import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../../../lib/database';
import { attendanceService, Group, SetupPresence, Attendance } from '../services/attendanceService';
import { toast } from 'sonner';

export const useAttendance = () => {
    const queryClient = useQueryClient();

    // --- ÉTAT LOCAL DE L'INTERFACE ---
    // On garde trace de la date et de la période (Matin/AM) choisies par l'utilisateur
    const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);
    const [currentPeriod, setCurrentPeriod] = useState('matin');
    const [isSetupLocked, setIsSetupLocked] = useState(false);
    // forceUnlocked : l'enseignant a cliqué "Réactiver l'édition" → court-circuite isAllPlaced
    const [forceUnlocked, setForceUnlocked] = useState(false);

    // Identifiants techniques de la classe et du type d'appel sélectionnés
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [selectedSetupId, setSelectedSetupId] = useState<string | null>(null);

    // 0. Récupération de l'utilisateur connecté
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Chargement de la liste des classes (Groupes)
    const { data: groups = [] } = useQuery({
        queryKey: ['groups', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await attendanceService.fetchGroups(user.id);
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    // Automatisme : au chargement, on essaie de rouvrir la dernière classe utilisée par l'enseignant
    useEffect(() => {
        if (!selectedGroupId && groups.length > 0 && user) {
            attendanceService.getUserPreferences(user.id, 'presence_last_group_id').then(lastGroupId => {
                const lastGroup = groups.find(g => g.id === lastGroupId);
                setSelectedGroupId(lastGroup?.id || groups[0].id);
            });
        }
    }, [groups, selectedGroupId, user]);

    // Quand l'enseignant change de contexte (date, période, classe),
    // on réinitialise le forceUnlocked pour que le verrouillage naturel reprenne
    useEffect(() => {
        setForceUnlocked(false);
        setIsSetupLocked(false);
    }, [currentDate, currentPeriod, selectedGroupId]);

    const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId) || null, [groups, selectedGroupId]);

    // 2. Chargement des élèves de la classe sélectionnée
    const { data: students = [] } = useQuery({
        queryKey: ['students', user?.id, selectedGroupId],
        queryFn: async () => {
            if (!user || !selectedGroupId) return [];
            return await attendanceService.fetchStudentsByGroup(selectedGroupId, user.id);
        },
        enabled: !!selectedGroupId && !!user,
        staleTime: 1000 * 60 * 5,
    });

    // 3. Chargement des types d'appels configurés (Matin, Cantine, Ateliers...)
    const { data: setups = [] } = useQuery({
        queryKey: ['attendance-setup', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await attendanceService.fetchSetups(user.id);
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5,
    });

    // 4. Chargement des statuits de présence (Présent, Absent, Retard...) pour l'appel choisi
    const { data: categories = [] } = useQuery({
        queryKey: ['attendance-categories', user?.id, selectedSetupId],
        queryFn: async () => {
            if (!selectedSetupId || !user) return [];
            return await attendanceService.fetchCategories(selectedSetupId, user.id);
        },
        enabled: !!selectedSetupId && !!user,
        staleTime: 1000 * 60 * 5,
    });

    const selectedSetup = useMemo(() => setups.find(s => s.id === selectedSetupId) || (setups.length > 0 ? setups[0] : null), [setups, selectedSetupId]);

    // 5. Détection automatique : si un appel a déjà commencé, on verrouille le choix du type d'appel
    const { data: existingSetupId, isLoading: isCheckingExisting } = useQuery({
        queryKey: ['attendance-check-setup', user?.id, currentDate, currentPeriod, selectedGroupId],
        queryFn: async () => {
            if (!selectedGroupId || students.length === 0 || !user) return null;
            const existingSetup = await attendanceService.checkExistingSetup(currentDate, currentPeriod, students.map(s => s.id), user.id);
            return existingSetup || null;
        },
        enabled: !!user && !!selectedGroupId && students.length > 0,
    });

    useEffect(() => {
        // IMPORTANT : On attend que la vérification du setup existant soit terminée
        // pour éviter de basculer sur un setup par défaut puis de re-basculer juste après.
        if (isCheckingExisting) return;

        if (existingSetupId) {
            setSelectedSetupId(existingSetupId);
            setIsSetupLocked(true); 
        } else {
            setIsSetupLocked(false);
            if (setups.length > 0 && !selectedSetupId) {
                setSelectedSetupId(setups[0].id);
            }
        }
    }, [existingSetupId, isCheckingExisting, setups, selectedSetupId]);

    // 6. Chargement des données de présence réelles
    const { data: attendances = [], isLoading: isAttendanceLoading } = useQuery({
        queryKey: ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId],
        queryFn: async () => {
            if (!user || !selectedGroupId || !selectedSetupId || students.length === 0) return [];
            return await attendanceService.fetchAttendances(currentDate, currentPeriod, students.map(s => s.id), selectedSetupId, user.id);
        },
        enabled: !!user && !!selectedGroupId && !!selectedSetupId && students.length > 0,
        staleTime: 1000 * 60,
    });

    // État de chargement global pour éviter les sauts d'interface
    // On considère qu'on charge si l'utilisateur n'est pas là, ou si les données structurelles arrivent
    const isInitialLoading = !user || 
        (groups.length === 0 && !selectedGroupId && !isCheckingExisting) || 
        (selectedGroupId && students.length === 0 && !attendances.length) ||
        isCheckingExisting;

    // --- OPÉRATIONS DE SAUVEGARDE (MUTATIONS) ---

    // Sauvegarde unitaire (quand on déplace UN élève)
    const upsertMutation = useMutation({
        mutationFn: (rec: Attendance) => {
            if (!user) throw new Error("User required");
            return attendanceService.upsertAttendance(rec, user.id);
        },
        onMutate: async (newRecord) => {
            // Logique optimiste : on met à jour l'écran immédiatement avant confirmation du serveur
            const queryKey = ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Attendance[]>(queryKey) || [];

            const exists = previous.find(a => a.eleve_id === newRecord.eleve_id);
            if (exists) {
                queryClient.setQueryData<Attendance[]>(queryKey, previous.map(a => a.eleve_id === newRecord.eleve_id ? { ...a, ...newRecord } : a));
            } else {
                queryClient.setQueryData<Attendance[]>(queryKey, [...previous, newRecord]);
            }
            return { previous, queryKey };
        },
        onSuccess: (realRecord, _variables, context) => {
            // ✅ Le serveur retourne le vrai UUID → on remplace l'id temporaire dans le cache
            if (context?.queryKey) {
                queryClient.setQueryData<Attendance[]>(context.queryKey, (old = []) =>
                    old.map(a => a.eleve_id === realRecord.eleve_id ? realRecord : a)
                );
            }
            // On invalide attendance-check-setup UNIQUEMENT en cas de succès réel
            // pour indiquer qu'un appel a commencé (verrouillage voulu)
            queryClient.invalidateQueries({ queryKey: ['attendance-check-setup', user?.id, currentDate, currentPeriod, selectedGroupId] });
        },
        onError: (_err, _variables, context) => {
            // En cas d'erreur serveur : rollback visuel UNIQUEMENT, sans invalider check-setup
            // (évite de verrouiller l'édition sur une erreur transitoire)
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        // Pas de onSettled : invalider les queries ici (même en cas d'erreur) causait
        // le rechargement de attendance-check-setup → verrouillage intempestif + saut arrière.
        // Le bouclier Realtime (RealtimeSyncContext) gère la syncho externe.
    });


    // Suppression (quand un élève revient dans la zone "Non assigné")
    const deleteMutation = useMutation({
        mutationFn: (id: string) => {
            if (!user) throw new Error("User required");
            return attendanceService.deleteAttendance(id, user.id);
        },
        onMutate: async (id) => {
            const queryKey = ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Attendance[]>(queryKey) || [];
            queryClient.setQueryData<Attendance[]>(queryKey, previous.filter(a => a.id !== id.toString()));
            return { previous, queryKey };
        },
        onSuccess: () => {
            // Invalide check-setup pour recalculer le verrou (si plus aucun élève placé → déverrouille)
            queryClient.invalidateQueries({ queryKey: ['attendance-check-setup', user?.id, currentDate, currentPeriod, selectedGroupId] });
        },
        onError: (_err, _variables, context) => {
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        }
    });

    // Sauvegarde groupée (ex: "Tout le monde présent")
    const bulkMutation = useMutation({
        mutationFn: (recs: any[]) => {
            if (!user) throw new Error("User required");
            return attendanceService.bulkInsertAttendances(recs, user.id);
        },
        onMutate: async (newRecords: any[]) => {
            // Mise à jour optimiste : affichage immédiat dans les bonnes colonnes
            const queryKey = ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<Attendance[]>(queryKey) || [];

            // Construire une map des nouveaux enregistrements par eleve_id
            const newMap = new Map(newRecords.map((r, i) => [r.eleve_id, {
                ...r,
                id: `bulk-temp-${Date.now()}-${i}`,
                created_at: new Date().toISOString(),
                updated_at: null,
            }]));

            // Mise à jour : on met à jour les existants ET on ajoute les nouveaux
            const updated = previous.map(a =>
                newMap.has(a.eleve_id)
                    ? { ...a, ...newMap.get(a.eleve_id)! } // Update : écrase categorie_id + status
                    : a
            );
            const existingEleveIds = new Set(previous.map(a => a.eleve_id));
            const toAdd = Array.from(newMap.values()).filter(r => !existingEleveIds.has(r.eleve_id));

            queryClient.setQueryData<Attendance[]>(queryKey, [...updated, ...toAdd]);
            return { previous, queryKey };
        },
        onSuccess: (realRecords: Attendance[], _variables, context) => {
            // Remplace les IDs temporaires par les vrais UUIDs retournés par le serveur
            if (context?.queryKey && realRecords?.length) {
                const realMap = new Map(realRecords.map(r => [r.eleve_id, r]));
                queryClient.setQueryData<Attendance[]>(context.queryKey, (old = []) =>
                    old.map(a => realMap.has(a.eleve_id) ? realMap.get(a.eleve_id)! : a)
                );
            }
            // Invalide uniquement check-setup pour enregistrer que l'appel a commencé
            queryClient.invalidateQueries({ queryKey: ['attendance-check-setup', user?.id, currentDate, currentPeriod, selectedGroupId] });
        },
        onError: (_err, _variables, context) => {
            // Rollback visuel si le serveur échoue
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        // Pas de onSettled : même raison que upsertMutation (évite le rechargement parasite)
    });

    // --- ACTIONS EXPOSÉES À L'INTERFACE ---

    /** Déplace un élève d'un statut à un autre. */
    const moveStudent = async (studentId: string, targetId: string) => {
        if (!selectedSetup || !user) return;

        // On lit le cache React Query directement (pas la closure `attendances`)
        // pour éviter les race conditions lors de 2 glissés rapides successifs
        const attendanceQueryKey = ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId];
        const freshAttendances = queryClient.getQueryData<Attendance[]>(attendanceQueryKey) || [];

        const currentRecord = freshAttendances.find(a => a.eleve_id === studentId);
        const currentCatId = currentRecord?.categorie_id || 'unassigned';
        if (currentCatId === targetId) return;

        if (targetId === 'unassigned') {
            if (currentRecord?.id) deleteMutation.mutate(currentRecord.id);
        } else {
            const targetCategory = categories.find(c => c.id === targetId);
            const isAbsence = targetCategory?.nom.toLowerCase().includes('absent');
            const newRecord: Attendance = {
                id: currentRecord?.id || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                date: currentDate,
                periode: currentPeriod,
                eleve_id: studentId,
                setup_id: selectedSetup.id,
                categorie_id: targetId,
                status: isAbsence ? 'absent' : 'present',
                user_id: user.id,
                created_at: currentRecord?.created_at || new Date().toISOString(),
                updated_at: currentRecord?.updated_at || null
            };
            upsertMutation.mutate(newRecord);
        }
    };

    /** Met tous les élèves restants en 'Absent'. */
    const markUnassignedAbsent = async () => {
        const unassigned = students.filter(s => !attendances.find(a => a.eleve_id === s.id));
        if (unassigned.length === 0 || !user || !selectedSetup) return;

        const absentCat = categories.find(c => c.nom === 'Absent');
        const newRecords = unassigned.map(s => ({
            date: currentDate,
            periode: currentPeriod,
            eleve_id: s.id,
            setup_id: selectedSetup.id,
            categorie_id: absentCat?.id || null,
            status: 'absent',
            user_id: user.id
        }));

        bulkMutation.mutate(newRecords);
    };

    /** Met tous les élèves restants en 'Présent' (première catégorie disponible). */
    const markUnassignedPresent = async () => {
        const unassigned = students.filter(s => !attendances.find(a => a.eleve_id === s.id));
        if (unassigned.length === 0 || !user || !selectedSetup) return;

        const presentCat = categories.find(c => c.nom !== 'Absent');
        const newRecords = unassigned.map(s => ({
            date: currentDate,
            periode: currentPeriod,
            eleve_id: s.id,
            setup_id: selectedSetup.id,
            categorie_id: presentCat?.id || null,
            status: 'present',
            user_id: user.id
        }));

        bulkMutation.mutate(newRecords);
    };

    // --- UTILITAIRES POUR L'AFFICHAGE ---
    
    // Récupère les élèves d'une catégorie précise
    const getStudentsForCategory = (catId: string) => {
        return students.filter(s => {
            const att = attendances.find(a => a.eleve_id === s.id);
            return att && att.categorie_id === catId;
        });
    };

    // Récupère les élèves qui n'ont pas encore été pointés
    const getUnassignedStudents = () => {
        // Un élève est "non signé" s'il n'a AUCUN enregistrement de présence pour ce moment
        return students.filter(s => !attendances.find(a => a.eleve_id === s.id));
    };

    const getSystemAbsentStudents = () => {
        return students.filter(s => {
            const att = attendances.find(a => a.eleve_id === s.id);
            return att && att.status === 'absent';
        });
    };

    // isAllPlaced : VRAI seulement quand tous les élèves de la classe ont une présence
    // ET que l'enseignant n'a pas cliqué "Réactiver l'édition" (forceUnlocked)
    const isAllPlaced = !forceUnlocked && students.length > 0 && students.every(s => attendances.find(a => a.eleve_id === s.id));

    return {
        // Données
        groups, selectedGroup,
        students,
        setups, selectedSetup,
        categories,
        attendances,
        currentDate, currentPeriod,
        loading: isAttendanceLoading, 
        isInitialLoading,
        error: null,
        isSetupLocked,
        // isAllPlaced : vrai uniquement quand TOUS les élèves ont une présence enregistrée
        // → c'est CE flag qui verrouille les cartes, pas isSetupLocked
        isAllPlaced,

        // Actions de sélection
        setSelectedGroup: (group: Group | null) => {
            setSelectedGroupId(group?.id || null);
            if (group && user) attendanceService.saveGroupPreference(user.id, group.id);
        },
        setSelectedSetup: (setup: SetupPresence | null) => {
            setSelectedSetupId(setup?.id || null);
        },
        setCurrentDate,
        setCurrentPeriod,
        unlockEditing: () => {
            setIsSetupLocked(false);
            setForceUnlocked(true); // Déverrouille aussi les cartes (isAllPlaced devient false)
            toast.success("Édition réactivée");
        },
        refreshData: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance-setup', user?.id] });
            queryClient.invalidateQueries({ queryKey: ['attendance-categories', user?.id, selectedSetupId] });
        },

        // Actions métier
        moveStudent,
        markUnassignedAbsent,
        markUnassignedPresent,

        // Sélecteurs de données
        getStudentsForCategory,
        getUnassignedStudents,
        getSystemAbsentStudents
    };
};

export default useAttendance;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. INITIALISATION : Le hook vérifie l'utilisateur et charge sa classe préférée.
 * 2. CHARGEMENT : Il télécharge en parallèle les élèves, les types d'appels et les présences du jour.
 * 3. INTERACTION : L'enseignant déplace une carte élève (ex: 'Marc' vers 'Cantine').
 * 4. MISE À JOUR OPTIMISTE : Le hook met à jour l'écran immédiatement (Marc apparaît dans Cantine).
 * 5. PERSISTANCE : Il envoie la commande à Supabase en arrière-plan.
 * 6. SYNCHRONISATION : Si une autre tablette change une donnée, le hook rafraîchit l'écran grâce au cache de `TanStack Query`.
 */
