import { useState, useCallback } from 'react';
import { getCacheStats, clearPhotoCache, isCacheEnabled, setCacheEnabled } from '../../../lib/storage';
import { getSyncStats, clearAllSyncData } from '../../../lib/sync';
import { supabase } from '../../../lib/database';
import { toast } from 'sonner';
import { Tables } from '../../../types/supabase';

/**
 * useCacheSettings
 * 
 * Hook pour gérer :
 * - Le cache des photos (IndexedDB)
 * - Les données de synchronisation delta
 * - La mise à jour en masse des indices de branches
 */
export const useCacheSettings = () => {
    // Cache photos
    const [cacheStats, setCacheStats] = useState({ count: 0, estimatedSize: 0 });
    const [cacheEnabled, setCacheEnabledState] = useState(isCacheEnabled());
    const [isLoadingCacheStats, setIsLoadingCacheStats] = useState(false);

    // Delta Sync
    const [syncStats, setSyncStats] = useState<any[]>([]);
    const [isLoadingSyncStats, setIsLoadingSyncStats] = useState(false);

    // Bulk Update (indices par branche)
    const [branches, setBranches] = useState<Partial<Tables<'Branche'>>[]>([]);
    const [allStudents, setAllStudents] = useState<Partial<Tables<'Eleve'>>[]>([]);
    const [selectedBulkBranch, setSelectedBulkBranch] = useState('');
    const [selectedBulkIndex, setSelectedBulkIndex] = useState<number | string>(50);
    const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);
    const [isLoadingBulkData, setIsLoadingBulkData] = useState(false);

    // Charge les statistiques du cache
    const loadCacheStats = useCallback(async () => {
        setIsLoadingCacheStats(true);
        const stats = await getCacheStats();
        setCacheStats(stats);
        setIsLoadingCacheStats(false);
    }, []);

    // Vide le cache des photos
    const handleClearCache = useCallback(async () => {
        if (!confirm('Vider le cache des photos ? Elles seront rechargées depuis le serveur.')) return;

        const success = await clearPhotoCache();
        if (success) {
            toast.success("Cache vidé avec succès");
            loadCacheStats();
        } else {
            toast.error("Erreur lors du vidage du cache");
        }
    }, [loadCacheStats]);

    // Active/désactive le cache
    const handleToggleCache = useCallback((enabled: boolean) => {
        setCacheEnabled(enabled);
        setCacheEnabledState(enabled);
        toast.success(enabled ? "Cache activé" : "Cache désactivé");
        if (enabled) {
            loadCacheStats();
        }
    }, [loadCacheStats]);

    // Charge les stats de synchronisation
    const loadSyncStats = useCallback(async () => {
        setIsLoadingSyncStats(true);
        const stats = await getSyncStats();
        setSyncStats(stats);
        setIsLoadingSyncStats(false);
    }, []);

    // Vide les données de sync
    const handleClearSyncData = useCallback(async () => {
        if (!confirm('Vider les données de synchronisation ?')) return;

        await clearAllSyncData();
        toast.success("Données de sync vidées");
        loadSyncStats();
    }, [loadSyncStats]);

    // Charge les données pour la mise à jour en masse
    const fetchBulkData = useCallback(async () => {
        setIsLoadingBulkData(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: branchesData } = await supabase
                .from('Branche')
                .select('id, nom')
                .order('nom');
            setBranches(branchesData || []);

            const { data: studentsData } = await supabase
                .from('Eleve')
                .select('id, prenom, nom')
                .order('prenom');
            setAllStudents(studentsData || []);
        } catch (err) {
            console.error("Error fetching bulk data:", err);
        } finally {
            setIsLoadingBulkData(false);
        }
    }, []);

    // Met à jour tous les indices pour une branche
    const handleBulkUpdateIndices = useCallback(async () => {
        if (!selectedBulkBranch) {
            toast.error("Veuillez sélectionner une branche");
            return;
        }

        if (!confirm(`Appliquer l'indice ${selectedBulkIndex}% à tous les élèves (${allStudents.length}) ?`)) return;

        setIsUpdatingBulk(true);
        const toastId = toast.loading("Mise à jour des indices...");

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            const { data: prefData } = await supabase
                .from('UserPreference')
                .select('value')
                .eq('user_id', user.id)
                .eq('key', 'eleve_profil_competences')
                .maybeSingle();

            const currentPrefs: any = prefData?.value || {};
            const newPrefs = { ...currentPrefs };

            allStudents.forEach(student => {
                if (student.id) {
                    if (!newPrefs[student.id]) newPrefs[student.id] = {};
                    newPrefs[student.id][selectedBulkBranch] = typeof selectedBulkIndex === 'string' ? parseInt(selectedBulkIndex, 10) : selectedBulkIndex;
                }
            });

            const { error } = await supabase
                .from('UserPreference')
                .upsert({
                    user_id: user.id,
                    key: 'eleve_profil_competences',
                    value: newPrefs,
                } as any, { onConflict: 'user_id, key' });

            if (error) throw error;

            toast.success(`Indices mis à jour pour ${allStudents.length} élèves !`, { id: toastId });
        } catch (err) {
            toast.error("Erreur lors de la mise à jour.", { id: toastId });
        } finally {
            setIsUpdatingBulk(false);
        }
    }, [selectedBulkBranch, selectedBulkIndex, allStudents]);

    // Ajuste les indices (+/- delta)
    const handleBulkAdjustIndices = useCallback(async (delta: number) => {
        if (!selectedBulkBranch) {
            toast.error("Veuillez sélectionner une branche");
            return;
        }

        const action = delta > 0 ? "augmenter" : "diminuer";
        if (!confirm(`${action} l'indice de ${Math.abs(delta)}% pour tous les élèves ?`)) return;

        setIsUpdatingBulk(true);
        const toastId = toast.loading(`Ajustement des indices (${delta > 0 ? '+' : ''}${delta}%)...`);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Utilisateur non trouvé");

            const { data: prefData } = await supabase
                .from('UserPreference')
                .select('value')
                .eq('user_id', user.id)
                .eq('key', 'eleve_profil_competences')
                .maybeSingle();

            const currentPrefs: any = prefData?.value || {};
            const newPrefs = { ...currentPrefs };

            allStudents.forEach(student => {
                if (student.id) {
                    if (!newPrefs[student.id]) newPrefs[student.id] = {};
                    const currentVal = newPrefs[student.id][selectedBulkBranch] ?? 50;
                    newPrefs[student.id][selectedBulkBranch] = Math.max(0, Math.min(100, currentVal + delta));
                }
            });

            const { error } = await supabase
                .from('UserPreference')
                .upsert({
                    user_id: user.id,
                    key: 'eleve_profil_competences',
                    value: newPrefs,
                } as any, { onConflict: 'user_id, key' });

            if (error) throw error;

            toast.success(`Indices ajustés pour ${allStudents.length} élèves !`, { id: toastId });
        } catch (err) {
            toast.error("Erreur lors de l'ajustement.", { id: toastId });
        } finally {
            setIsUpdatingBulk(false);
        }
    }, [selectedBulkBranch, allStudents]);

    return {
        // Cache
        cacheStats,
        cacheEnabled,
        isLoadingCacheStats,
        loadCacheStats,
        handleClearCache,
        handleToggleCache,
        // Sync
        syncStats,
        isLoadingSyncStats,
        loadSyncStats,
        handleClearSyncData,
        // Bulk
        branches,
        allStudents,
        selectedBulkBranch,
        setSelectedBulkBranch,
        selectedBulkIndex,
        setSelectedBulkIndex,
        isUpdatingBulk,
        isLoadingBulkData,
        fetchBulkData,
        handleBulkUpdateIndices,
        handleBulkAdjustIndices
    };
};
