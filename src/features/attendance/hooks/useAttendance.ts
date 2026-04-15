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
    const [isEditing, setIsEditing] = useState(false);
    const [isSetupLocked, setIsSetupLocked] = useState(false);

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
    const { data: existingSetupId } = useQuery({
        queryKey: ['attendance-check-setup', user?.id, currentDate, currentPeriod, selectedGroupId],
        queryFn: async () => {
            if (!selectedGroupId || students.length === 0 || !user) return null;
            const existingSetup = await attendanceService.checkExistingSetup(currentDate, currentPeriod, students.map(s => s.id), user.id);
            return existingSetup || null;
        },
        enabled: !!user && !!selectedGroupId && students.length > 0,
    });

    useEffect(() => {
        if (existingSetupId) {
            setSelectedSetupId(existingSetupId);
            setIsSetupLocked(true); // Sécurité : impossible de changer de type d'appel si des données existent déjà
        } else {
            setIsSetupLocked(false);
            if (setups.length > 0 && !selectedSetupId) setSelectedSetupId(setups[0].id);
        }
    }, [existingSetupId, setups, selectedSetupId]);

    // 6. Chargement des données de présence réelles
    const { data: attendances = [], isLoading: loading } = useQuery({
        queryKey: ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId],
        queryFn: async () => {
            if (!user || !selectedGroupId || !selectedSetupId || students.length === 0) return [];
            return await attendanceService.fetchAttendances(currentDate, currentPeriod, students.map(s => s.id), selectedSetupId, user.id);
        },
        enabled: !!user && !!selectedGroupId && !!selectedSetupId && students.length > 0,
        staleTime: 1000 * 60,
    });

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
            // ✅ CORRECTION : le serveur retourne le vrai UUID (remplace l'id temporaire dans le cache)
            // Sans ça, l'élève garde un id "temp-xxx" → le 2ème déplacement créait un doublon en base
            if (context?.queryKey) {
                queryClient.setQueryData<Attendance[]>(context.queryKey, (old = []) =>
                    old.map(a => a.eleve_id === realRecord.eleve_id ? realRecord : a)
                );
            }
        },
        onError: (_err, _variables, context) => {
            // En cas d'erreur serveur, on annule le changement visuel
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
            queryClient.invalidateQueries({ queryKey: context?.queryKey });
        }
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', user?.id, currentDate, currentPeriod, selectedGroupId, selectedSetupId] });
        }
    });

    // --- ACTIONS EXPOSÉES À L'INTERFACE ---

    /** Déplace un élève d'un statut à un autre. */
    const moveStudent = async (studentId: string, targetId: string) => {
        if (!selectedSetup || !user) return;

        const currentRecord = attendances.find(a => a.eleve_id === studentId);
        const currentCatId = currentRecord?.categorie_id || 'unassigned';
        if (currentCatId === targetId) return;

        if (targetId === 'unassigned') {
            if (currentRecord?.id) deleteMutation.mutate(currentRecord.id);
        } else {
            const newRecord: Attendance = {
                id: currentRecord?.id || `temp-${Date.now()}`,
                date: currentDate,
                periode: currentPeriod,
                eleve_id: studentId,
                setup_id: selectedSetup.id,
                categorie_id: targetId === 'unassigned' ? null : targetId,
                status: 'present',
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
        return students.filter(s => !attendances.find(a => a.eleve_id === s.id && a.status === 'present'));
    };

    const getPureUnassignedStudents = () => {
        return students.filter(s => !attendances.find(a => a.eleve_id === s.id));
    };

    const getSystemAbsentStudents = () => {
        return students.filter(s => {
            const att = attendances.find(a => a.eleve_id === s.id);
            return att && att.status === 'absent';
        });
    };

    return {
        // Données
        groups, selectedGroup,
        students,
        setups, selectedSetup,
        categories,
        attendances,
        currentDate, currentPeriod,
        loading, error: null,
        isEditing, isSetupLocked,

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
        setIsEditing,
        unlockEditing: () => {
            setIsSetupLocked(false);
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
        getPureUnassignedStudents,
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
