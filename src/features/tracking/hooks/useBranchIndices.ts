/**
 * Nom du module/fichier : useBranchIndices.ts
 * 
 * Données en entrée : 
 *   - L'état de connexion (isOnline).
 *   - Les préférences de l'utilisateur stockées en base de données.
 * 
 * Données en sortie : 
 *   - `branches` : La liste des matières (Maths, Français, etc.).
 *   - `studentIndices` : Un tableau croisé qui contient le "Score de Confiance" de chaque élève pour chaque matière (ex: Lucas a 80% en calcul mais 20% en géométrie).
 *   - `actions` : Fonctions pour charger les données et mettre à jour un score.
 * 
 * Objectif principal : Gérer le curseur de confiance de l'enseignant. Le logiciel utilise ces indices pour savoir s'il doit contrôler un élève ou non. Si l'enseignant règle Lucas à 100% en lecture, le logiciel validera ses exercices automatiquement. S'il le règle à 0%, le logiciel demandera systématiquement une validation humaine (🟣). Ce hook permet de régler ces curseurs manuellement ou de les laisser évoluer automatiquement suite aux validations.
 * 
 * Ce que ça contient : 
 *   - La récupération de la liste des matières.
 *   - Le chargement et la sauvegarde des réglages personnalisés (Profil de l'élève).
 *   - La gestion du mode hors-ligne : si on change un curseur sans internet, l'info est mise en attente.
 *   - La mise à jour instantanée de l'écran (affichage réactif).
 */

import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/database';
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
 * Hook de gestion des scores de confiance par matière.
 */
export const useBranchIndices = () => {
    const { isOnline, addToQueue } = useOfflineSync();
    
    // ÉTATS : Références et Données
    const [branches, setBranches] = useState<Tables<'Branche'>[]>([]);
    const [studentIndices, setStudentIndices] = useState<BranchIndicesMap>({});

    /** 
     * CHARGEMENT DES MATIÈRES : 
     * On récupère la liste officielle des branches (Français, Maths, etc.).
     */
    const fetchBranches = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const data = await moduleService.getBranches(user.id);
        setBranches(data);
    }, []);

    /** 
     * CHARGEMENT DES PRÉFÉRENCES : 
     * On récupère le "Carnet de Confiance" de l'enseignant.
     */
    const loadUserPreferences = useCallback(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const val = await trackingService.loadUserPreference(user.id, 'eleve_profil_competences');
        if (val) {
            setStudentIndices(val as BranchIndicesMap);
        }
    }, []);

    /** 
     * SAUVEGARDE : 
     * Enregistre les nouveaux scores sur le serveur.
     */
    const saveUserPreferences = useCallback(async (newIndices: BranchIndicesMap) => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // GESTION HORS-LIGNE : 
        // Si le Wi-Fi a coupé, on met le changement dans la pile d'attente.
        if (!isOnline) {
            addToQueue({
                type: 'SUPABASE_CALL', table: 'UserPreference', method: 'upsert',
                payload: { user_id: user.id, key: 'eleve_profil_competences', value: newIndices, updated_at: new Date().toISOString() },
                match: { user_id: user.id, key: 'eleve_profil_competences' },
                contextDescription: "Sauvegarde préférences profils"
            });
            return;
        }

        // Si on est en ligne, on enregistre pour de vrai.
        await trackingService.saveUserPreference(user.id, 'eleve_profil_competences', newIndices);
    }, [isOnline, addToQueue]);

    /** 
     * ACTION : Modifier manuellement le score d'un enfant dans une matière.
     */
    const handleUpdateBranchIndex = useCallback(async (studentId: string, branchId: string, newValue: string) => {
        const val = newValue === '' ? null : parseInt(newValue, 10);

        setStudentIndices(prev => {
            const next = { ...prev };
            if (!next[studentId]) next[studentId] = {};
            next[studentId][branchId] = val;

            // Sauvegarde automatique suite au changement.
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

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant remarque que Julie est très autonome en "Calcul mental".
 * 2. RÉGLAGE : Il ouvre le profil de Julie et déplace le curseur vers 90%.
 * 3. MISE À JOUR : Le hook `useBranchIndices` met à jour l'affichage et prévient le serveur.
 * 4. EFFET : À partir de maintenant, 9 fois sur 10, quand Julie validera une table de multiplication, le logiciel marquera "✅ Terminé" sans déranger l'enseignant.
 * 5. DÉTECTION : Si Julie commence à faire beaucoup d'erreurs, l'enseignant pourra redescendre le curseur pour reprendre le contrôle manuel (🟣).
 */
