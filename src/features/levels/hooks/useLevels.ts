/**
 * Nom du module/fichier : useLevels.ts
 * 
 * Données en entrée : 
 *   - L'identifiant de l'enseignant (fourni par le système d'authentification).
 *   - Les termes de recherche pour filtrer les niveaux.
 * 
 * Données en sortie : 
 *   - La liste des niveaux scolaires filtrés (ex: CP, CE1).
 *   - La liste des élèves inscrits dans le niveau sélectionné.
 *   - Les fonctions pour créer, modifier, supprimer ou classer les niveaux.
 * 
 * Objectif principal : Centraliser toute la "logique métier" des niveaux scolaires. Ce hook s'occupe de mémoriser quel niveau est actuellement ouvert, de déclencher le chargement des élèves correspondants, et de gérer les mises à jour instantanées à l'écran (UI Optimiste).
 * 
 * Ce que ça affiche : Rien (c'est un moteur logique), mais il alimente la page de gestion des niveaux.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { levelService } from '../services/levelService';
import { LevelWithStudentCount } from '../../../types';
import { toast } from 'sonner';
import { Tables, TablesInsert, TablesUpdate } from '../../../types/supabase';

export const useLevels = () => {
    // ÉTATS DE MÉMOIRE : Liste des niveaux, état du chargement, texte de recherche, etc.
    const [levels, setLevels] = useState<LevelWithStudentCount[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedLevel, setSelectedLevel] = useState<LevelWithStudentCount | null>(null);
    const [students, setStudents] = useState<Tables<'Eleve'>[]>([]);
    const [loadingStudents, setLoadingStudents] = useState<boolean>(false);

    /**
     * CHARGEMENT DES NIVEAUX :
     * Récupère la liste depuis la base de données et sélectionne automatiquement 
     * le premier niveau si rien n'est encore choisi.
     */
    const fetchLevels = useCallback(async () => {
        setLoading(true);
        try {
            const data = await levelService.fetchLevels();
            setLevels(data);

            setSelectedLevel(current => {
                if (current) return current;
                return data.length > 0 ? data[0] : null;
            });
        } catch (error) {
            console.error("Error fetching levels:", error);
            toast.error("Erreur lors du chargement des niveaux");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLevels();
    }, [fetchLevels]);

    /**
     * CHARGEMENT DES ÉLÈVES :
     * Dès que l'enseignant clique sur un niveau différent, ce bloc réagit
     * et va chercher la liste des enfants inscrits dans ce niveau précisément.
     */
    useEffect(() => {
        if (selectedLevel) {
            const loadStudents = async () => {
                setLoadingStudents(true);
                try {
                    const data = await levelService.fetchStudents(selectedLevel.id);
                    setStudents(data);
                } catch (error) {
                    console.error("Error fetching students:", error);
                    toast.error("Erreur lors du chargement des élèves");
                } finally {
                    setLoadingStudents(false);
                }
            };
            loadStudents();
        } else {
            setStudents([]);
        }
    }, [selectedLevel]);

    // Filtrage automatique des niveaux selon ce que l'enseignant tape dans la barre de recherche
    const filteredLevels = useMemo(() => {
        return levels.filter(l =>
            l.nom.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [levels, searchTerm]);

    /**
     * ACTIONS DE GESTION :
     * Créer, Modifier, Supprimer.
     * Note 기술 : On utilise des mises à jour "optimistes" pour que l'enseignant 
     * ne voie jamais de temps de latence à l'écran.
     */
    const createLevel = async (levelData: TablesInsert<'Niveau'>): Promise<boolean> => {
        try {
            const newLevel = await levelService.createLevel(levelData);
            setLevels(prev => [...prev, newLevel]);
            setSelectedLevel(newLevel);
            toast.success("Niveau créé avec succès");
            return true;
        } catch (error) {
            console.error("Error creating level:", error);
            toast.error("Erreur lors de la création");
            return false;
        }
    };

    const updateLevel = async (id: string, levelData: TablesUpdate<'Niveau'>): Promise<boolean> => {
        const previousLevels = [...levels];
        const previousSelected = selectedLevel;

        // On change le nom à l'écran immédiatement
        setLevels(prev => prev.map(l => l.id === id ? { ...l, ...levelData } as LevelWithStudentCount : l));
        if (selectedLevel && selectedLevel.id === id) {
            setSelectedLevel(prev => prev ? ({ ...prev, ...levelData } as LevelWithStudentCount) : null);
        }

        try {
            const updated = await levelService.updateLevel(id, levelData);
            setLevels(prev => prev.map(l => l.id === id ? updated : l));
            if (selectedLevel && selectedLevel.id === id) {
                setSelectedLevel(updated);
            }
            toast.success("Niveau mis à jour");
            return true;
        } catch (error) {
            console.error("Error updating level:", error);
            // Retour en arrière si le serveur est inaccessible
            setLevels(previousLevels);
            setSelectedLevel(previousSelected);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    const deleteLevel = async (id: string): Promise<boolean> => {
        const previousLevels = [...levels];
        const previousSelected = selectedLevel;

        const newLevels = levels.filter(l => l.id !== id);
        setLevels(newLevels);

        if (selectedLevel && selectedLevel.id === id) {
            setSelectedLevel(newLevels.length > 0 ? newLevels[0] : null);
        }

        try {
            await levelService.deleteLevel(id);
            toast.success("Niveau supprimé");
            return true;
        } catch (error) {
            console.error("Error deleting level:", error);
            setLevels(previousLevels);
            setSelectedLevel(previousSelected);
            toast.error("Erreur lors de la suppression");
            return false;
        }
    };

    /**
     * RÉORGANISATION :
     * Envoie le nouvel ordre de tri (1, 2, 3...) à la base de données.
     */
    const reorderLevels = async (newLevels: LevelWithStudentCount[]) => {
        setLevels(newLevels);
        try {
            const updates = newLevels.map((item, index) => ({
                id: item.id,
                nom: item.nom,
                user_id: item.user_id,
                ordre: index + 1
            }));
            await levelService.updateOrder(updates);
        } catch (error) {
            console.error("Error reordering levels:", error);
            toast.error("Erreur lors de la réorganisation");
            fetchLevels();
        }
    };

    return {
        levels,
        loading,
        filteredLevels,
        searchTerm,
        setSearchTerm,
        selectedLevel,
        setSelectedLevel,
        students,
        loadingStudents,
        createLevel,
        updateLevel,
        deleteLevel,
        reorderLevels
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le panneau de gestion des niveaux s'ouvre.
 * 2. ÉTAPE INITIALE : `useLevels` récupère tous les niveaux (ex: CP, CM1, CM2).
 * 3. ÉTAPE SÉLECTION : Il sélectionne "CP" par défaut.
 * 4. ÉLECTROCHOC LOGIQUE : Puisque "CP" est sélectionné, il lance automatiquement une recherche pour trouver les élèves de CP.
 * 5. INTERACTION TECHNIQUE : Si l'enseignant renomme "CP" en "Cours Préparatoire" :
 *    - Le hook met à jour l'affichage immédiatement.
 *    - Il contacte discrètement le serveur `levelService` pour valider le changement.
 *    - En cas d'échec internet, il rétablit le nom d'origine "CP" pour rester honnête avec l'utilisateur.
 */
