/**
 * Nom du module/fichier : useBranches.ts
 * 
 * Données en entrée : 
 *   - L'identifiant de l'enseignant connecté (récupéré via le contexte d'authentification).
 *   - Les termes de recherche saisis par l'utilisateur.
 * 
 * Données en sortie : 
 *   - La liste des branches filtrées.
 *   - Les fonctions de gestion (créer, modifier, supprimer, réordonner).
 *   - L'état de chargement (`loading`).
 * 
 * Objectif principal : Servir de "cerveau" pour la gestion des matières. Ce hook orchestre les appels au service de données, gère la mémoire locale (état) pour un affichage instantané, et s'occupe de la sélection de la branche active.
 * 
 * Ce que ça affiche : Rien (c'est un hook de logique), mais il alimente les composants de la vue "Matières".
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { branchService } from '../services/branchService';
import { toast } from 'sonner';
import type { Database } from '../../../types/supabase';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type BrancheInsert = Database['public']['Tables']['Branche']['Insert'];
type BrancheUpdate = Database['public']['Tables']['Branche']['Update'];

type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];

export const useBranches = () => {
    const [branches, setBranches] = useState<BrancheRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<BrancheRow | null>(null);
    const [subBranches, setSubBranches] = useState<SousBrancheRow[]>([]);
    const [loadingSub, setLoadingSub] = useState<boolean>(false);

    /**
     * RÉCUPÉRATION DES MATIÈRES :
     * Interroge le service pour obtenir toutes les branches de l'enseignant.
     */
    const fetchBranches = useCallback(async () => {
        setLoading(true);
        try {
            const data = await branchService.fetchBranches();
            setBranches(data);
        } catch (error) {
            console.error("Error fetching branches:", error);
            toast.error("Erreur lors du chargement des branches");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    // Sélection automatique de la première branche de la liste si aucune n'est choisie.
    useEffect(() => {
        if (branches.length > 0 && !selectedBranch) {
            setSelectedBranch(branches[0]);
        }
    }, [branches, selectedBranch]);

    /**
     * RÉCUPÉRATION DES SOUS-BRANCHES :
     * Dès qu'une branche est sélectionnée, on va chercher ses sous-matières rattachées.
     */
    const fetchSubBranches = useCallback(async (branchId: string) => {
        if (!branchId) {
            setSubBranches([]);
            return;
        }
        setLoadingSub(true);
        try {
            const data = await branchService.fetchSubBranches(branchId);
            setSubBranches(data);
        } catch (error) {
            console.error("Error fetching sub-branches:", error);
        } finally {
            setLoadingSub(false);
        }
    }, []);

    useEffect(() => {
        if (selectedBranch) {
            fetchSubBranches(selectedBranch.id);
        } else {
            setSubBranches([]);
        }
    }, [selectedBranch, fetchSubBranches]);

    // Filtrage dynamique de la liste selon l'ordinateur de recherche
    const filteredBranches = useMemo(() => {
        return branches.filter(b =>
            b.nom.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [branches, searchTerm]);

    /**
     * CRÉATION D'UNE BRANCHE :
     * Ajoute une nouvelle matière et met à jour immédiatement la liste affichée.
     */
    const createBranch = async (branchData: BrancheInsert): Promise<boolean> => {
        try {
            const newBranch = await branchService.createBranch(branchData);
            setBranches(prev => {
                const updated = [...prev, newBranch];
                return updated.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
            });
            setSelectedBranch(newBranch);
            toast.success("Branche créée");
            return true;
        } catch (error) {
            console.error("Error creating branch:", error);
            toast.error("Erreur lors de la création");
            return false;
        }
    };

    /**
     * MISE À JOUR (Optimiste) :
     * On modifie visuellement la branche avant même d'avoir la réponse du serveur
     * pour que l'interface soit ultra-réactive. On annule en cas d'erreur.
     */
    const updateBranch = async (id: string, branchData: BrancheUpdate): Promise<boolean> => {
        const previousBranches = [...branches];
        const previousSelected = selectedBranch;

        // Mise à jour visuelle immédiate
        setBranches(prev => prev.map(b => b.id === id ? { ...b, ...branchData } as BrancheRow : b));
        if (selectedBranch && selectedBranch.id === id) {
            setSelectedBranch(prev => prev ? ({ ...prev, ...branchData } as BrancheRow) : null);
        }

        try {
            const updated = await branchService.updateBranch(id, branchData);
            setBranches(prev => prev.map(b => b.id === id ? updated : b));
            if (selectedBranch && selectedBranch.id === id) {
                setSelectedBranch(updated);
            }
            toast.success("Branche mise à jour");
            return true;
        } catch (error) {
            console.error("Error updating branch:", error);
            // Retour en arrière si le serveur a échoué
            setBranches(previousBranches);
            setSelectedBranch(previousSelected);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    /**
     * SUPPRESSION :
     * Retire la branche de la liste et sélectionne la suivante par défaut.
     */
    const deleteBranch = async (id: string): Promise<boolean> => {
        const previousBranches = [...branches];
        const previousSelected = selectedBranch;

        const newBranches = branches.filter(b => b.id !== id);
        setBranches(newBranches);

        if (selectedBranch && selectedBranch.id === id) {
            setSelectedBranch(newBranches.length > 0 ? newBranches[0] : null);
        }

        try {
            await branchService.deleteBranch(id);
            toast.success("Branche supprimée");
            return true;
        } catch (error: any) {
            console.error("Error deleting branch:", error);
            setBranches(previousBranches);
            setSelectedBranch(previousSelected);
            toast.error(error.message || "Erreur lors de la suppression");
            return false;
        }
    };

    /**
     * RÉORGANISATION :
     * Sauvegarde le nouvel ordre des branches principales.
     */
    const reorderBranches = async (newBranches: BrancheRow[]) => {
        setBranches(newBranches);
        try {
            const updates = newBranches.map((item, index) => ({
                id: item.id,
                nom: item.nom,
                user_id: item.user_id,
                photo_url: item.photo_url,
                ordre: index + 1
            }));
            await branchService.updateOrder(updates);
        } catch (error) {
            console.error("Error reordering:", error);
            toast.error("Erreur réorganisation");
            fetchBranches();
        }
    };

    /**
     * RÉORGANISATION DES SOUS-BRANCHES :
     * Sauvegarde le nouvel ordre des spécialités (ex: mettre Géométrie avant Algèbre).
     */
    const reorderSubBranches = async (newSubBranches: SousBrancheRow[]) => {
        setSubBranches(newSubBranches);
        try {
            const updates = newSubBranches.map((item, index) => ({
                id: item.id,
                nom: item.nom,
                branche_id: item.branche_id,
                user_id: item.user_id,
                photo_url: item.photo_url,
                ordre: index + 1
            }));
            await branchService.updateSubBranchOrder(updates);
        } catch (error) {
            console.error("Error reordering sub-branches:", error);
            toast.error("Erreur réorganisation sous-branches");
            if (selectedBranch) fetchSubBranches(selectedBranch.id);
        }
    };

    const refreshSubBranches = () => {
        if (selectedBranch) fetchSubBranches(selectedBranch.id);
    };

    return {
        branches,
        loading,
        filteredBranches,
        searchTerm,
        setSearchTerm,
        selectedBranch,
        setSelectedBranch,
        subBranches,
        loadingSub,
        createBranch,
        updateBranch,
        deleteBranch,
        reorderBranches,
        reorderSubBranches,
        refreshSubBranches
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le composant demande au hook `useBranches` de s'activer.
 * 2. ÉTAPE CHARGEMENT : Le hook va chercher toutes les matières de l'enseignant.
 * 3. ÉTAPE SÉLECTION : Si aucune matière n'est choisie, il sélectionne automatiquement la première de la liste.
 * 4. ÉTAPE DÉPENDANCE : Dès qu'une matière est sélectionnée, il lance une seconde recherche pour trouver toutes les sous-matières liées.
 * 5. INTERACTION TECHNIQUE : Si l'enseignant crée une nouvelle branche, le hook envoie la demande au serveur, et s'il réussit, il l'ajoute instantanément à l'écran en la classant par ordre alphabétique.
 * 6. SÉCURITÉ : Pour les modifications et suppressions, il pratique le "Mise à jour optimiste" : il change l'écran d'abord, et si le serveur renvoie une erreur, il rétablit silencieusement l'état précédent.
 */
