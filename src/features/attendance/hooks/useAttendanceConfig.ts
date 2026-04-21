/**
 * Nom du module/fichier : useAttendanceConfig.ts
 * 
 * Données en entrée : 
 *   - selectedGroup & selectedSetup : Les choix actuels de l'enseignant.
 *   - currentDateForExport : La date servant de base aux calculs d'export.
 *   - isOpen : Indique si la modale de configuration est affichée.
 * 
 * Données en sortie : 
 *   - États de navigation interne (onglets, vues liste/édition).
 *   - Liste des configurations (sets) et des catégories.
 *   - Données préparées pour l'export (listes de dates par semaine/mois).
 *   - Fonctions d'action (créer, sauver, supprimer, copier une période).
 * 
 * Objectif principal : Ce hook gère la "Face B" du module Présence : la configuration et les rapports. Il transforme la base de données brute en informations utilisables pour l'interface : il calcule par exemple quelles sont les dates disponibles pour créer un rapport mensuel ou hebdomadaire. C'est lui qui s'occupe de la sauvegarde complexe des types d'appels et de leurs catégories colorées.
 */

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCurrentUser } from '../../../lib/database';
import { attendanceService, Group, SetupPresence, CategoriePresence } from '../services/attendanceService';
import { toast } from 'sonner';

interface UseAttendanceConfigProps {
    selectedGroup: Group | null;
    selectedSetup: SetupPresence | null;
    currentDateForExport: string;
    isOpen: boolean;
}

export interface CategoryWithTemp extends Partial<CategoriePresence> {
    id: string;
    nom: string;
    couleur: string | null | undefined;
    isTemp?: boolean;
}

export const useAttendanceConfig = ({
    selectedSetup,
    currentDateForExport,
    isOpen
}: UseAttendanceConfigProps) => {
    const queryClient = useQueryClient();
    
    // --- ÉTATS LOCAUX DE NAVIGATION ---
    const [view, setView] = useState<'list' | 'edit'>('list');
    const [activeTab, setActiveTab] = useState<'general' | 'config' | 'export'>('general');
    
    // État temporaire durant l'édition d'une configuration
    const [currentSet, setCurrentSet] = useState<{ id: string | null; nom: string; description: string | null } | null>(null);
    const [categories, setCategories] = useState<CategoryWithTemp[]>([]);

    // Paramètres d'export (Jour/Semaine/Mois)
    const [exportMode, setExportMode] = useState<'day' | 'week' | 'month'>('day');
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [selectedDay, setSelectedDay] = useState(currentDateForExport);

    // 0. Utilisateur actuel
    const { data: user } = useQuery({
        queryKey: ['user'],
        queryFn: getCurrentUser,
        staleTime: Infinity,
    });

    // 1. Récupération des configurations enregistrées
    const { data: sets = [], isLoading: loadingSets } = useQuery({
        queryKey: ['attendance-setup', user?.id],
        queryFn: async () => {
            if (!user) return [];
            return await attendanceService.fetchSetups(user.id);
        },
        enabled: isOpen && !!user,
        staleTime: 1000 * 60 * 5,
    });

    // 2. Recherche des dates où des appels ont eu lieu (pour l'onglet Export)
    const { data: distinctDates = [] } = useQuery({
        queryKey: ['attendance-dates', user?.id, selectedSetup?.id],
        queryFn: async () => {
            if (!user || !selectedSetup) return [];
            return await attendanceService.fetchDistinctDates(selectedSetup.id, user.id);
        },
        enabled: activeTab === 'export' && !!selectedSetup && !!user,
    });

    // 3. Récupération des données brutes pour un intervalle donné
    const [exportRange, setExportRange] = useState<{ start: string; end: string } | null>(null);
    
    const { data: exportData = [], isLoading: loadingExport } = useQuery({
        queryKey: ['attendance-range', user?.id, exportRange?.start, exportRange?.end],
        queryFn: async () => {
            if (!user || !exportRange) return [];
            return await attendanceService.fetchAttendanceRange(exportRange.start, exportRange.end, user.id);
        },
        enabled: activeTab === 'export' && !!exportRange && !!user,
    });

    // --- ACTIONS DE MODIFICATION (MUTATIONS) ---

    // Suppression d'une configuration avec affichage instantané (Optimistic UI)
    const deleteSetupMutation = useMutation({
        mutationFn: (id: string) => {
            if (!user) throw new Error("User required");
            return attendanceService.deleteSetup(id, user.id);
        },
        onMutate: async (id) => {
            const queryKey = ['attendance-setup', user?.id];
            await queryClient.cancelQueries({ queryKey });
            const previous = queryClient.getQueryData<any[]>(queryKey) || [];
            // Suppression instantanée de la liste
            queryClient.setQueryData<any[]>(queryKey, previous.filter(s => s.id !== id));
            return { previous, queryKey };
        },
        onError: (_err, _variables, context) => {
            // Rollback si le serveur refuse la suppression
            if (context?.previous) queryClient.setQueryData(context.queryKey, context.previous);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance-setup', user?.id] });
            toast.success("Configuration supprimée");
        }
    });

    // Sauvegarde (Création ou Mise à jour) d'une configuration et de ses sous-catégories
    const saveSetupMutation = useMutation({
        mutationFn: async ({ currentSet, categories, onConfigSaved }: { currentSet: any, categories: CategoryWithTemp[], onConfigSaved?: () => void }) => {
            if (!user) throw new Error("Non authentifié");
            
            let setupId = currentSet.id;
            if (setupId) {
                await attendanceService.updateSetup(setupId, user.id, currentSet.nom, currentSet.description);
            } else {
                const newSetup = await attendanceService.createSetup(user.id, currentSet.nom, currentSet.description);
                setupId = newSetup.id;
            }

            // Préparation des catégories pour l'envoi en salle de données
            const categoriesToUpsert = categories.map(c => ({
                id: c.isTemp ? undefined : c.id,
                setup_id: setupId!,
                nom: c.nom,
                couleur: c.couleur || '#3B82F6',
                user_id: user.id
            }));

            await attendanceService.upsertCategories(categoriesToUpsert, user.id);
            // On s'assure que la catégorie 'Absent' existe toujours (système)
            await attendanceService.ensureAbsentCategory(setupId!, user.id);
            
            return { setupId, onConfigSaved };
        },
        onSuccess: ({ onConfigSaved }) => {
            queryClient.invalidateQueries({ queryKey: ['attendance-setup', user?.id] });
            setView('list');
            if (onConfigSaved) onConfigSaved();
            toast.success("Configuration sauvegardée");
        }
    });

    /** Sert à dupliquer les données du matin vers l'après-midi pour gagner du temps. */
    const copyPeriodMutation = useMutation({
        mutationFn: async ({ source, target, onConfigSaved }: { source: string, target: string, onConfigSaved?: () => void }) => {
            if (!selectedSetup || !user) throw new Error("Sélection manquante");
            await attendanceService.copyPeriodData(currentDateForExport, selectedSetup.id, source, target, user.id);
            return onConfigSaved;
        },
        onSuccess: (onConfigSaved) => {
            toast.success("Données copiées");
            if (onConfigSaved) onConfigSaved();
            queryClient.invalidateQueries({ queryKey: ['attendance', user?.id] });
        }
    });

    // --- CALCUL DES PÉRIODES DISPONIBLES POUR L'EXPORT ---
    // Cette partie génère la liste textuelle (ex: "Semaine du 4 au 8 mars") affichée dans le menu déroulant d'export
    const availablePeriods = useMemo(() => {
        if (activeTab !== 'export' || exportMode === 'day' || distinctDates.length === 0) return [];
        
        const periods: { label: string; value: string }[] = [];
        const seen = new Set<string>();

        const toLocalISODate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        distinctDates.forEach((dateStr) => {
            const [y, m, d] = dateStr.split('-').map(Number);
            const date = new Date(y, m - 1, d, 12, 0, 0);
            let value: string, label: string;

            if (exportMode === 'week') {
                // On calcule le lundi et le vendredi de la semaine de cette date
                const day = date.getDay();
                const daysToMonday = day === 0 ? 6 : day - 1;
                const monday = new Date(date);
                monday.setDate(date.getDate() - daysToMonday);
                const friday = new Date(monday);
                friday.setDate(monday.getDate() + 4);

                value = `${toLocalISODate(monday)}:${toLocalISODate(friday)}`;
                label = `Semaine du ${monday.toLocaleDateString('fr-FR')} au ${friday.toLocaleDateString('fr-FR')}`;
            } else { // Mode Mois
                const monthName = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
                const firstDay = new Date(y, m - 1, 1, 12, 0, 0);
                const lastDay = new Date(y, m, 0, 12, 0, 0);
                value = `${toLocalISODate(firstDay)}:${toLocalISODate(lastDay)}`;
                label = monthName.charAt(0).toUpperCase() + monthName.slice(1);
            }

            if (!seen.has(value)) {
                seen.add(value);
                periods.push({ label, value });
            }
        });
        return periods;
    }, [activeTab, exportMode, distinctDates]);

    // Sélection automatique de la première période disponible
    useEffect(() => {
        if (availablePeriods.length > 0 && !selectedPeriod) {
            setSelectedPeriod(availablePeriods[0].value);
        }
    }, [availablePeriods, selectedPeriod]);

    // Transforme une période (ex: "Lundi:Vendredi") en une liste de dates individuelles (Lundi, Mardi, Mercredi...)
    const exportDates = useMemo(() => {
        if (exportMode === 'day') return [selectedDay];
        if (!selectedPeriod) return [];
        
        const [start, end] = selectedPeriod.split(':');
        const dates: string[] = [];
        const [startY, startM, startD] = start.split('-').map(Number);
        const [endY, endM, endD] = end.split('-').map(Number);
        const curr = new Date(startY, startM - 1, startD, 12, 0, 0);
        const last = new Date(endY, endM - 1, endD, 12, 0, 0);

        while (curr <= last) {
            const day = curr.getDay();
            if (day !== 0 && day !== 6) { // On ignore Samedi et Dimanche
                const dayStr = String(curr.getDate()).padStart(2, '0');
                const monthStr = String(curr.getMonth() + 1).padStart(2, '0');
                dates.push(`${curr.getFullYear()}-${monthStr}-${dayStr}`);
            }
            curr.setDate(curr.getDate() + 1);
        }
        return dates;
    }, [exportMode, selectedDay, selectedPeriod]);

    // Synchronise la plage de dates avec le chargement des données
    useEffect(() => {
        if (activeTab !== 'export') return;
        if (exportMode === 'day') {
            setExportRange({ start: selectedDay, end: selectedDay });
        } else if (selectedPeriod) {
            const [start, end] = selectedPeriod.split(':');
            setExportRange({ start, end });
        }
    }, [activeTab, exportMode, selectedDay, selectedPeriod]);

    // --- ACTIONS EXPOSÉES ---
    
    const handleCreateNew = () => {
        setCurrentSet({ id: null, nom: '', description: '' });
        setCategories([
            { id: 'temp-1', nom: 'Présent', couleur: '#10B981', isTemp: true },
            { id: 'temp-2', nom: 'En Retard', couleur: '#F59E0B', isTemp: true }
        ]);
        setView('edit');
    };

    /** Déplace un élément vers le haut (-1) ou vers le bas (+1) dans la liste. */
    const handleReorder = async (index: number, direction: -1 | 1) => {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= sets.length) return;

        // On réordonne la copie locale pour l'affichage immédiat
        const reordered = [...sets];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(newIndex, 0, moved);

        // On prépare les nouvelles valeurs d'ordre (0, 1, 2...)
        const updates = reordered.map((s, i) => ({ id: s.id, ordre: i }));

        // On met à jour le cache React Query immédiatement (sans attendre le serveur)
        queryClient.setQueryData(['attendance-setup', user?.id], reordered);

        // On sauvegarde en arrière-plan
        try {
            if (!user) return;
            await attendanceService.updateSetupOrders(updates, user.id);
        } catch (e) {
            console.error('Erreur lors de la sauvegarde de l’ordre :', e);
            // En cas d'échec, on recharge la liste depuis le serveur
            queryClient.invalidateQueries({ queryKey: ['attendance-setup', user?.id] });
        }
    };

    const handleEdit = async (set: SetupPresence) => {
        setCurrentSet(set);
        try {
            if (!user) return;
            const data = await attendanceService.fetchCategories(set.id, user.id);
            // On filtre 'Absent' car il est géré par le système, pas par l'utilisateur
            setCategories(data.filter((c: any) => c.nom !== 'Absent'));
            setView('edit');
        } catch (error) { console.error(error); }
    };

    const addCategory = () => {
        setCategories([...categories, { id: `temp-${Date.now()}`, nom: '', couleur: '#3B82F6', isTemp: true }]);
    };

    const removeCategory = async (index: number) => {
        const newCats = [...categories];
        const cat = newCats[index];
        if (!user) return;
        if (!cat.isTemp && cat.id) {
            try {
                await attendanceService.deleteCategory(cat.id, user.id);
                newCats.splice(index, 1);
                setCategories(newCats);
            } catch (e) { console.error(e); }
        } else {
            newCats.splice(index, 1);
            setCategories(newCats);
        }
    };

    const updateCategory = (index: number, field: keyof CategoryWithTemp, value: any) => {
        const newCats = [...categories];
        // @ts-ignore
        newCats[index][field] = value;
        setCategories(newCats);
    };

    return {
        sets,
        loading: loadingSets || loadingExport || saveSetupMutation.isPending || deleteSetupMutation.isPending || copyPeriodMutation.isPending,
        view, setView,
        currentSet, setCurrentSet,
        categories, setCategories,
        activeTab, setActiveTab,
        exportMode, setExportMode,
        availablePeriods,
        selectedPeriod, setSelectedPeriod,
        exportData: exportData || [],
        exportDates,
        selectedDay, setSelectedDay,

        handleCreateNew,
        handleReorder,
        handleEdit,
        handleDeleteSet: (id: string) => deleteSetupMutation.mutate(id),
        handleSaveSet: (onConfigSaved?: () => void) => {
            if (!currentSet) return;
            saveSetupMutation.mutate({ currentSet, categories, onConfigSaved });
        },
        addCategory,
        removeCategory,
        updateCategory,
        handleCopyPeriod: (source: string, target: string, onConfigSaved?: () => void) => 
            copyPeriodMutation.mutate({ source, target, onConfigSaved }),
        fetchSets: () => queryClient.invalidateQueries({ queryKey: ['attendance-setup', user?.id] })
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. INITIALISATION : Le hook surveille l'ouverture de la modale.
 * 2. CONFIGURATION : 
 *    - L'utilisateur édite un type d'appel.
 *    - Le hook maintient une copie locale (`currentSet`, `categories`).
 *    - Au clic sur Enregistrer, il synchronise tout avec Supabase.
 * 3. PRÉPARATION EXPORT :
 *    - L'utilisateur choisit le mode "Semaine".
 *    - Le hook scanne les dates existantes en DB et suggère des plages de lundis-vendredis.
 *    - Quand l'utilisateur choisit une plage, le hook télécharge toutes les présences correspondantes.
 * 4. SORTIE : Les données filtrées et formatées sont envoyées aux composants `AttendanceExportTab` et `AttendancePDF`.
 */
