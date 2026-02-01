import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/database';
// @ts-ignore
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { Tables } from '../../../types/supabase';
import { moduleService } from '../../modules/services/moduleService';
import { trackingService } from '../services/trackingService';

interface BranchIndicesMap {
    [studentId: string]: {
        [branchId: string]: number | null;
    };
}

/**
 * useBranchIndices
 * 
 * Hook pour la gestion des indices de performance par branche :
 * - Chargement des branches
 * - Chargement/sauvegarde des préférences utilisateur
 * - Mise à jour par élève/branche
 */
export const useBranchIndices = () => {
    const { isOnline, addToQueue } = useOfflineSync();
    const [branches, setBranches] = useState<Tables<'Branche'>[]>([]);
    const [studentIndices, setStudentIndices] = useState<BranchIndicesMap>({});

    // Charge les branches
    const fetchBranches = useCallback(async () => {
        const data = await moduleService.getBranches();
        setBranches(data);
    }, []);

    // Charge les préférences utilisateur (indices)
    const loadUserPreferences = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const val = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
        if (val) {
            setStudentIndices(val as BranchIndicesMap);
        }
    }, []);

    // Sauvegarde les préférences
    const saveUserPreferences = useCallback(async (newIndices: BranchIndicesMap) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (!isOnline) {
            addToQueue({
                type: 'SUPABASE_CALL',
                table: 'UserPreference',
                method: 'upsert',
                payload: {
                    user_id: user.id,
                    key: 'eleve_profil_competences',
                    value: newIndices,
                    updated_at: new Date().toISOString()
                },
                match: { user_id: user.id, key: 'eleve_profil_competences' },
                contextDescription: "Sauvegarde préférences profils"
            });
            return;
        }

        await trackingService.saveUserPreference(user.id, 'eleve_profil_competences', newIndices);
    }, [isOnline, addToQueue]);

    // Met à jour l'indice pour un élève/branche
    const handleUpdateBranchIndex = useCallback(async (studentId: string, branchId: string, newValue: string) => {
        const val = newValue === '' ? null : parseInt(newValue, 10);

        setStudentIndices(prev => {
            const next = { ...prev };
            if (!next[studentId]) next[studentId] = {};
            next[studentId][branchId] = val;

            // Sauvegarde différée
            saveUserPreferences(next);
            return next;
        });
    }, [saveUserPreferences]);

    return {
        branches,
        studentIndices,
        fetchBranches,
        loadUserPreferences,
        handleUpdateBranchIndex
    };
};
