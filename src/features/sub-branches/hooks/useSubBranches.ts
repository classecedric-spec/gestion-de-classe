/**
 * Nom du module/fichier : useSubBranches.ts
 * 
 * Données en entrée : 
 *   - L'identifiant de l'enseignant (implicite via la session).
 *   - Termes de recherche utilisateur.
 * 
 * Données en sortie : 
 *   - Liste des sous-matières (spécialités) avec leurs parents.
 *   - Fonctions de gestion (créer, modifier, supprimer).
 *   - État de chargement (`loading`).
 * 
 * Objectif principal : Agir comme le "fournisseur officiel" de données pour toutes les spécialités de l'école. Ce hook gère la communication avec le service, maintient la liste à jour en mémoire, et permet de filtrer les résultats instantanément selon ce que l'enseignant cherche.
 * 
 * Ce que ça affiche : Rien (c'est de la logique pure), mais il pilote les composants de la page "Sous-branches".
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { subBranchService, SubBranchWithParent, SousBrancheInsert, SousBrancheUpdate } from '../services/subBranchService';
import { toast } from 'sonner';

/**
 * Hook personnalisé pour centraliser toute la logique de gestion des sous-matières.
 */
export const useSubBranches = () => {
    const [subBranches, setSubBranches] = useState<SubBranchWithParent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedSubBranch, setSelectedSubBranch] = useState<SubBranchWithParent | null>(null);

    /**
     * RÉCUPÉRATION INITIALE : Charge toutes les sous-branches depuis la base de données.
     */
    const fetchSubBranches = useCallback(async () => {
        setLoading(true);
        try {
            const data = await subBranchService.fetchAll();
            setSubBranches(data);
        } catch (error) {
            console.error('Error fetching sub-branches:', error);
            toast.error('Erreur lors du chargement des sous-branches');
        } finally {
            setLoading(false);
        }
    }, []);

    // Sélection automatique de la première de la liste pour ne pas laisser l'écran vide au départ
    useEffect(() => {
        if (subBranches.length > 0 && !selectedSubBranch) {
            setSelectedSubBranch(subBranches[0]);
        }
    }, [subBranches, selectedSubBranch]);

    /**
     * CRÉATION : Envoie une nouvelle spécialité au service et l'ajoute à la liste locale.
     */
    const createSubBranch = useCallback(async (subBranchData: SousBrancheInsert): Promise<boolean> => {
        try {
            const newSubBranch = await subBranchService.create(subBranchData);
            setSubBranches(prev => [...prev, newSubBranch].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
            setSelectedSubBranch(newSubBranch);
            toast.success('Sous-branche créée avec succès');
            return true;
        } catch (error) {
            console.error('Error creating sub-branch:', error);
            toast.error('Erreur lors de la création');
            return false;
        }
    }, []);

    /**
     * MISE À JOUR : Modifie une spécialité existante et rafraîchit l'affichage.
     */
    const updateSubBranch = useCallback(async (id: string, subBranchData: SousBrancheUpdate): Promise<boolean> => {
        try {
            const updated = await subBranchService.update(id, subBranchData);
            setSubBranches(prev =>
                prev.map(sb => sb.id === id ? updated : sb).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
            );

            if (selectedSubBranch?.id === id) {
                setSelectedSubBranch(updated);
            }

            toast.success('Sous-branche modifiée avec succès');
            return true;
        } catch (error) {
            console.error('Error updating sub-branch:', error);
            toast.error('Erreur lors de la modification');
            return false;
        }
    }, [selectedSubBranch]);

    /**
     * SUPPRESSION : Retire une spécialité de la base et de la mémoire locale.
     */
    const deleteSubBranch = useCallback(async (id: string): Promise<boolean> => {
        try {
            await subBranchService.delete(id);
            setSubBranches(prev => prev.filter(sb => sb.id !== id));

            if (selectedSubBranch?.id === id) {
                setSelectedSubBranch(null);
            }

            toast.success('Sous-branche supprimée avec succès');
            return true;
        } catch (error: any) {
            console.error('Error deleting sub-branch:', error);
            toast.error(error.message || 'Erreur lors de la suppression');
            return false;
        }
    }, [selectedSubBranch]);

    /**
     * FILTRAGE DYNAMIQUE : Calcule en temps réel quelles sous-matières correspondent
     * à ce que l'enseignant tape dans la barre de recherche.
     */
    const filteredSubBranches = useMemo(() => {
        return subBranches.filter(sb =>
            (sb.nom && sb.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (sb.Branche?.nom && sb.Branche.nom.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [subBranches, searchTerm]);

    // Lancement automatique du chargement à l'arrivée sur la page
    useEffect(() => {
        fetchSubBranches();
    }, [fetchSubBranches]);

    return {
        subBranches,
        loading,
        searchTerm,
        setSearchTerm,
        selectedSubBranch,
        setSelectedSubBranch,
        filteredSubBranches,
        createSubBranch,
        updateSubBranch,
        deleteSubBranch,
        fetchSubBranches,
    };
};

export default useSubBranches;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le composant `SubBranches` demande au hook d'initialiser les données.
 * 2. ÉTAPE RÉCUPÉRATION : Le hook contacte Supabase pour avoir la liste de toutes les spécialités.
 * 3. ÉTAPE TRI : Les données reçues sont classées par ordre alphabétique pour faciliter la lecture.
 * 4. ÉTAPE SURVEILLANCE : Si l'enseignant tape "Dictée" dans la recherche, le hook recalcul immédiatement `filteredSubBranches` pour n'afficher que ce qui correspond.
 * 5. ÉTAPE ACTION : Lors d'une suppression, le hook ordonne la suppression au serveur, et s'il reçoit le feu vert, il "gomme" l'élément de l'écran sans avoir besoin de recharger toute la page.
 */
