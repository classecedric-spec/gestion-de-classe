/**
 * Nom du module/fichier : useAdults.ts
 * 
 * Données en entrée : 
 *   - Appels au service adultService pour les opérations de données.
 * 
 * Données en sortie : 
 *   - filteredAdults : Liste des adultes filtrée par la recherche.
 *   - loading : État du chargement réseau.
 *   - Fonctions CRUD : createAdult, updateAdult, deleteAdult.
 * 
 * Objectif principal : Ce hook est le "cerveau" de la gestion des adultes. Il s'occupe de charger la liste depuis le serveur, de gérer le filtrage local (recherche par nom/prénom) et de synchroniser les modifications avec la base de données. Il utilise une technique de "mise à jour optimiste" : l'interface change instantanément avant même que le serveur n'ait répondu, pour une sensation de rapidité.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { adultService } from '../services/adultService';
import { toast } from 'sonner';
import type { Database } from '../../../types/supabase';

type AdultRow = Database['public']['Tables']['Adulte']['Row'];
type AdultInsert = Database['public']['Tables']['Adulte']['Insert'];
type AdultUpdate = Database['public']['Tables']['Adulte']['Update'];

export const useAdults = () => {
    // ÉTATS DE BASE
    const [adults, setAdults] = useState<AdultRow[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [searchTerm, setSearchTerm] = useState<string>('');

    // CHARGEMENT INITIAL : Récupération de la liste complète
    const fetchAdults = useCallback(async () => {
        setLoading(true);
        try {
            const data = await adultService.fetchAdults();
            setAdults(data);
        } catch (error) {
            console.error("Error fetching adults:", error);
            toast.error("Erreur lors du chargement des adultes");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAdults();
    }, [fetchAdults]);

    // LOGIQUE DE FILTRAGE : Mise à jour automatique quand la liste ou la recherche change
    const filteredAdults = useMemo(() => {
        return adults.filter(a =>
            a.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
            a.prenom.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [adults, searchTerm]);

    // CRÉATION D'UN NOUVEL ADULTE
    const createAdult = async (adultData: AdultInsert): Promise<boolean> => {
        try {
            const newAdult = await adultService.createAdult(adultData);
            // On ajoute l'adulte et on trie par nom pour garder la liste ordonnée
            setAdults(prev => [...prev, newAdult].sort((a, b) => a.nom.localeCompare(b.nom)));
            toast.success("Adulte ajouté");
            return true;
        } catch (error) {
            console.error("Error creating adult:", error);
            toast.error("Erreur lors de la création de l'adulte");
            return false;
        }
    };

    // MISE À JOUR D'UN PROFIL (Approche Optimiste)
    const updateAdult = async (id: string, adultData: AdultUpdate): Promise<boolean> => {
        const previousAdults = [...adults];

        // 1. On met à jour l'interface immédiatement (Optimiste)
        setAdults(prev => prev.map(a => a.id === id ? { ...a, ...adultData } as AdultRow : a));

        try {
            const updatedAdult = await adultService.updateAdult(id, adultData);
            // 2. On remplace par la donnée réelle du serveur pour être sûr des ID/Dates
            setAdults(prev => prev.map(a => a.id === id ? updatedAdult : a));
            toast.success("Profil mis à jour");
            return true;
        } catch (error) {
            console.error("Error updating adult:", error);
            // 3. En cas d'erreur réseau, on annule et on revient à l'état précédent
            setAdults(previousAdults);
            toast.error("Erreur lors de la mise à jour");
            return false;
        }
    };

    // SUPPRESSION D'UN ADULTE (Approche Optimiste)
    const deleteAdult = async (id: string): Promise<boolean> => {
        const previousAdults = [...adults];

        // 1. On retire de l'interface immédiatement
        setAdults(prev => prev.filter(a => a.id !== id));

        try {
            await adultService.deleteAdult(id);
            toast.success("Adulte supprimé");
            return true;
        } catch (error) {
            console.error("Error deleting adult:", error);
            // 2. On restaure si le serveur rejette la suppression
            setAdults(previousAdults);
            toast.error("Erreur lors de la suppression");
            return false;
        }
    };

    return {
        adults,
        loading,
        searchTerm,
        setSearchTerm,
        filteredAdults,
        fetchAdults,
        createAdult,
        updateAdult,
        deleteAdult
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. CHARGEMENT : fetchAdults appelle le service API et remplit l'état "adults".
 * 2. RECHERCHE : L'utilisateur tape un nom -> searchTerm change -> filteredAdults est recalculé.
 * 3. ACTION (C/U/D) : 
 *    a. L'interface est modifiée localement tout de suite (UI fluide).
 *    b. L'appel serveur est lancé en arrière-plan.
 *    c. En cas d'échec, le hook fait un "rollback" (retour arrière) pour que l'interface reflète la réalité.
 * 4. NOTIFICATION : Des messages "toast" (alertes discrètes) informent du succès ou de l'échec.
 */
