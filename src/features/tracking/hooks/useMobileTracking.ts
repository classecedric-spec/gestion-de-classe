/**
 * Nom du module/fichier : useMobileTracking.ts
 * 
 * Données en entrée : 
 *   - `groupId` : L'identifiant de la classe via l'URL.
 *   - L'état de connexion Internet (isOnline).
 * 
 * Données en sortie : 
 *   - `helpRequests` : La liste des élèves qui ont besoin d'aide, filtrée pour un affichage mobile.
 *   - `uniqueStudents` / `uniqueModules` : Listes pour les menus déroulants de filtrage.
 *   - `actions` : Fonctions pour valider un exercice, changer de classe, ou tirer au sort des tuteurs.
 * 
 * Objectif principal : Piloter l'expérience "Tablette" de l'enseignant. Quand l'enseignant circule dans les rangs avec sa tablette, ce hook lui permet d'avoir une vue simplifiée et ultra-réactive. Il gère les filtres rapides (par élève ou par matière), le mode hors-ligne pour les zones blanches de l'école, et la validation des exercices avec ajustement automatique de la confiance. 
 * 
 * Ce que ça contient : 
 *   - La synchronisation en temps réel des demandes d'aide.
 *   - La logique de "Validation avec score" (quand on valide, le logiciel propose d'ajuster l'indice de confiance de l'élève).
 *   - Le tirage au sort des tuteurs (comme sur le Desktop).
 *   - La mémorisation de la dernière classe visitée.
 */

import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../../lib/database';
import { toast } from 'sonner';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { trackingService, ProgressionWithDetails, StudentBasicInfo } from '../services/trackingService';
import { groupService } from '../../groups/services/groupService';
import { userService } from '../../users/services/userService';

/**
 * Hook de gestion du suivi pour l'interface Mobile (Tablette).
 */
export function useMobileTracking() {
    const { groupId } = useParams<{ groupId: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isOnline, addToQueue } = useOfflineSync();

    // --- REQUÊTES DE DONNÉES (Sync) ---

    // Récupère toutes les classes accessibles.
    const { data: groups = [] } = useQuery({
        queryKey: ['groups'],
        queryFn: () => groupService.getGroups(),
    });

    // Récupère les infos de la classe choisie (nom, etc.).
    const { data: groupInfo } = useQuery({
        queryKey: ['group', groupId],
        queryFn: () => groupId ? trackingService.fetchGroupInfo(groupId) : null,
        enabled: !!groupId,
    });

    // Récupère les élèves de la classe.
    const { data: studentsData } = useQuery({
        queryKey: ['students', 'group', groupId],
        queryFn: () => groupId ? trackingService.fetchStudentsInGroup(groupId) : null,
        enabled: !!groupId,
    });

    const studentsIds = useMemo(() => studentsData?.ids || [], [studentsData]);
    const fullStudents = useMemo(() => studentsData?.full || [], [studentsData]);

    // RÉCUPÉRATION DES ALERTES (Aide / À vérifier)
    const { data: helpRequests = [], isLoading: loading } = useQuery({
        queryKey: ['help-requests', studentsIds],
        queryFn: async () => {
            if (studentsIds.length === 0) return [];
            return trackingService.fetchHelpRequests(studentsIds);
        },
        enabled: studentsIds.length > 0,
    });

    // CHARGEMENT DES PRÉFÉRENCES (Indices de confiance, etc.)
    const { data: userPrefs } = useQuery({
        queryKey: ['user-preferences'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            const indices = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
            const skips = await trackingService.loadUserPreference(user.id, 'suivi_rotation_skips');
            return { indices: indices || {}, skips: skips || {}, userId: user.id };
        },
    });

    // --- ÉTATS LOCAUX (Interface) ---
    const [selectedStudentFilter, setSelectedStudentFilter] = useState<string | null>(null);
    const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
    const [selectedModuleFilter, setSelectedModuleFilter] = useState<string | null>(null);
    const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
    const [helpersCache, setHelpersCache] = useState<Record<string, StudentBasicInfo[]>>({});
    const [isAutoGenerating, setIsAutoGenerating] = useState<boolean>(false);
    
    // Pour la fenêtre de confirmation quand on valide un exercice.
    const [pendingValidation, setPendingValidation] = useState<{
        req: ProgressionWithDetails;
        action: 'non_valide' | 'status_quo' | 'valide';
        initialScore: number;
        adjustment: number;
        finalScore: number;
    } | null>(null);

    // --- ACTIONS ---

    /** 
     * CHANGEMENT DE CLASSE : Navigate vers le nouveau groupe et enregistre la préférence.
     */
    const handleGroupChange = async (newGroupId: string) => {
        if (newGroupId && newGroupId !== groupId) {
            if (userPrefs?.userId) await userService.updateLastSelectedGroup(userPrefs.userId, newGroupId);
            navigate(`/mobile-suivi/${newGroupId}`);
        }
    };

    /** 
     * ENTRAIDE : Trouve des tuteurs quand on clique sur une demande d'aide.
     */
    const handleExpandHelp = async (requestId: string, activityId: string | undefined) => {
        if (!activityId) return;
        if (expandedRequestId === requestId) { setExpandedRequestId(null); return; }
        setExpandedRequestId(requestId);
        if (helpersCache[requestId]) return;

        try {
            const helpers = await trackingService.findHelpers(activityId, studentsIds);
            const randomHelpers = helpers.sort(() => 0.5 - Math.random()).slice(0, 3);
            setHelpersCache(prev => ({ ...prev, [requestId]: randomHelpers }));
        } catch (err) { console.error(err); }
    };

    /** 
     * TIRAGE AU SORT : Sélectionne 3 élèves prioritaires pour le suivi.
     */
    const handleAutoSuivi = async () => {
        if (!fullStudents.length || isAutoGenerating || !groupId || !userPrefs) return;
        setIsAutoGenerating(true);
        try {
            const currentGroupSkips = userPrefs.skips[groupId] || {};
            const eligiblePool = fullStudents.filter(s => !(currentGroupSkips[s.id] > 0));
            const targets = eligiblePool.length > 0 ? eligiblePool : fullStudents;

            const candidates = targets.map(s => {
                const baseImp = (s as any).importance_suivi ?? 50;
                return { ...s, score: Math.random() * baseImp * (1 + Math.random()) };
            }).sort((a, b) => b.score - a.score).slice(0, 3);

            const selectedIds = new Set(candidates.map(c => c.id));
            const newRotationSkips = { ...userPrefs.skips };
            fullStudents.forEach(s => {
                if (selectedIds.has(s.id)) newRotationSkips[groupId] = { ...(newRotationSkips[groupId] || {}), [s.id]: 2 };
                else {
                    const currentVal = newRotationSkips[groupId]?.[s.id] || 0;
                    if (currentVal > 0) newRotationSkips[groupId] = { ...newRotationSkips[groupId], [s.id]: currentVal - 1 };
                }
            });

            await trackingService.saveUserPreference(userPrefs.userId, 'suivi_rotation_skips', newRotationSkips);
            const newProgs = candidates.map(student => ({ eleve_id: student.id, activite_id: null, etat: 'besoin_d_aide', is_suivi: true, user_id: userPrefs.userId, updated_at: new Date().toISOString() }));
            await trackingService.createProgressions(newProgs as any);
            toast.success("3 élèves ajoutés");
            queryClient.invalidateQueries({ queryKey: ['help-requests'] });
        } catch (err) { toast.error("Erreur"); } finally { setIsAutoGenerating(false); }
    };

    /** 
     * INITIALISATION DE LA VALIDATION : 
     * Calcule le nouvel indice de confiance avant de demander confirmation.
     */
    const initiateStatusUpdate = (req: ProgressionWithDetails, action: 'non_valide' | 'status_quo' | 'valide') => {
        let indexAdjustment = action === 'non_valide' ? 5 : (action === 'valide' ? -2 : 0);
        let currentVal = 50;
        if (req.activite?.Module?.SousBranche?.branche_id && req.eleve_id && userPrefs) {
            const branchId = req.activite.Module.SousBranche.branche_id;
            currentVal = Number((userPrefs.indices[req.eleve_id] || {})[branchId] ?? 50);
        }
        setPendingValidation({ req, action, initialScore: currentVal, adjustment: indexAdjustment, finalScore: Math.max(0, Math.min(100, currentVal + indexAdjustment)) });
    };

    /** 
     * CONFIRMATION ET ENVOI : 
     * Envoie la mise à jour finale au serveur (ou en file d'attente hors-ligne).
     */
    const handleStatusUpdate = async (req: ProgressionWithDetails, action: 'non_valide' | 'status_quo' | 'valide') => {
        try {
            let newStatus = action === 'valide' ? 'termine' : 'a_commencer';
            let indexAdjustment = action === 'non_valide' ? 5 : (action === 'valide' ? -2 : 0);

            // Mise à jour de l'indice de confiance si nécessaire.
            if (indexAdjustment !== 0 && req.activite?.Module?.SousBranche?.branche_id && req.eleve_id && userPrefs) {
                const branchId = req.activite.Module.SousBranche.branche_id;
                const studentData = userPrefs.indices[req.eleve_id] || {};
                const newVal = Math.max(0, Math.min(100, Number(studentData[branchId] ?? 50) + indexAdjustment));
                const newIndices = { ...userPrefs.indices, [req.eleve_id]: { ...studentData, [branchId]: newVal } };
                await trackingService.saveUserPreference(userPrefs.userId, 'eleve_profil_competences', newIndices);
            }

            if (!isOnline) {
                addToQueue({ type: 'SUPABASE_CALL', table: 'Progression', method: 'update', payload: { etat: newStatus, updated_at: new Date().toISOString(), is_suivi: false }, match: { id: req.id }, contextDescription: `Maj statut ${req.eleve?.prenom}` });
                toast.success("Action sauvegardée (Hors ligne)");
            } else {
                await trackingService.updateProgressionStatus(req.id, newStatus, req.is_suivi || false);
                toast.success("Mis à jour");
            }
            queryClient.invalidateQueries({ queryKey: ['help-requests'] });
        } catch (err) { toast.error("Erreur"); }
    };

    /** 
     * NETTOYAGE : Retire une demande de la tablette.
     */
    const handleClear = async (req: ProgressionWithDetails) => {
        try {
            if (!isOnline) {
                addToQueue({ type: 'SUPABASE_CALL', table: 'Progression', method: req.is_suivi ? 'delete' : 'update', payload: req.is_suivi ? null : { etat: 'a_commencer', updated_at: new Date().toISOString() }, match: { id: req.id }, contextDescription: `Reset statut ${req.eleve?.prenom}` });
            } else {
                if (req.is_suivi) await trackingService.deleteProgression(req.id);
                else await trackingService.updateProgressionStatus(req.id, 'a_commencer');
            }
            queryClient.invalidateQueries({ queryKey: ['help-requests'] });
            toast.success("Retiré");
        } catch (err) { toast.error("Erreur"); }
    };

    // --- LOGIQUE DE FILTRAGE DES ALERTES ---

    const uniqueStudents = useMemo(() => {
        const map = new Map();
        helpRequests.forEach(req => { if (req.eleve && req.eleve_id) map.set(req.eleve_id, req.eleve); });
        return Array.from(map.values()).sort((a,b) => (a.Niveau?.ordre ?? 999) - (b.Niveau?.ordre ?? 999) || a.prenom.localeCompare(b.prenom));
    }, [helpRequests]);

    const uniqueModules = useMemo(() => {
        const map = new Map();
        helpRequests.forEach(req => { if (req.activite?.Module) map.set(req.activite.Module.id, req.activite.Module); });
        return Array.from(map.values()).sort((a,b) => a.nom.localeCompare(b.nom));
    }, [helpRequests]);

    const displayedRequests = useMemo(() => {
        return helpRequests.filter(req => {
            const matchStudent = selectedStudentFilter ? req.eleve_id === selectedStudentFilter : true;
            const matchModule = selectedModuleFilter ? req.activite?.Module?.id === selectedModuleFilter : true;
            const matchStatus = selectedStatusFilter === 'all' ? true : req.etat === selectedStatusFilter;
            return matchStudent && matchModule && matchStatus;
        });
    }, [helpRequests, selectedStudentFilter, selectedModuleFilter, selectedStatusFilter]);

    return {
        states: { groupId, groups, groupName: groupInfo?.nom || '', helpRequests: displayedRequests, uniqueStudents, uniqueModules, selectedStudentFilter, selectedModuleFilter, selectedStatusFilter, loading, expandedRequestId, helpersCache, isAutoGenerating, isOnline, pendingValidation },
        actions: { handleGroupChange, handleExpandHelp, handleStatusUpdate: initiateStatusUpdate, confirmStatusUpdate: async () => { if (pendingValidation) { await handleStatusUpdate(pendingValidation.req, pendingValidation.action); setPendingValidation(null); } }, cancelStatusUpdate: () => setPendingValidation(null), handleClear, handleAutoSuivi, setSelectedStudentFilter: (id: string | null) => { setSelectedStudentFilter(id); if (id) setSelectedModuleFilter(null); }, setSelectedModuleFilter: (id: string | null) => { setSelectedModuleFilter(id); if (id) setSelectedStudentFilter(null); }, setSelectedStatusFilter }
    };
}

export default useMobileTracking;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant circule. Lucas lève la main pour valider son exercice de calcul.
 * 2. CLIC TABLETTE : L'enseignant trouve Lucas dans la liste "Aide" (remontée automatiquement en haut de pile).
 * 3. VALIDATION : Il clique sur le bouton ✅ "Valider". 
 * 4. FEEDBACK : Le hook propose : "Voulez-vous augmenter sa confiance de +2% ?". L'enseignant accepte.
 * 5. SYNC : Le logiciel met à jour l'exercice vers "Terminé" et recalcule l'indice de confiance de Lucas pour demain.
 * 6. POINT TECHNIQUE : Si la tablette perd le réseau dans le fond de la classe, le hook sauvegarde l'action localement et prévient l'enseignant. Tout sera envoyé au serveur dès qu'il repassera près de la borne Wi-Fi.
 */
