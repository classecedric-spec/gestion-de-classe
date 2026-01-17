import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useOfflineSync } from '../../../context/OfflineSyncContext';

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
    const [branches, setBranches] = useState([]);
    const [studentIndices, setStudentIndices] = useState({});

    // Charge les branches
    const fetchBranches = useCallback(async () => {
        const { data } = await supabase.from('Branche').select('id, nom').order('ordre');
        setBranches(data || []);
    }, []);

    // Charge les préférences utilisateur (indices)
    const loadUserPreferences = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
            .from('UserPreference')
            .select('value')
            .eq('user_id', user.id)
            .eq('key', 'eleve_profil_competences')
            .maybeSingle();

        if (data?.value) {
            setStudentIndices(data.value);
        }
    }, []);

    // Sauvegarde les préférences
    const saveUserPreferences = useCallback(async (newIndices) => {
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

        await supabase.from('UserPreference').upsert({
            user_id: user.id,
            key: 'eleve_profil_competences',
            value: newIndices,
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id, key' });
    }, [isOnline, addToQueue]);

    // Met à jour l'indice pour un élève/branche
    const handleUpdateBranchIndex = useCallback(async (studentId, branchId, newValue) => {
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
