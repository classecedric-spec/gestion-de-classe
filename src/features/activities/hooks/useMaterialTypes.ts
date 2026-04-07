/**
 * Nom du module/fichier : useMaterialTypes.ts
 * 
 * Données en entrée : Aucune (demande de liste ou ordres de modification).
 * 
 * Données en sortie : Liste exhaustive du matériel pédagogique disponible, état de chargement et fonctions de gestion (ajouter, renommer, supprimer).
 * 
 * Objectif principal : Gérer l'inventaire des "outils" ou "matériels" nécessaires pour réaliser les activités (ex: 'Ciseaux', 'Pâte à modeler', 'Jetons'). Ce Hook permet de maintenir à jour la liste globale du matériel que le professeur peut ensuite associer à ses ateliers.
 * 
 * Ce que ça affiche : Rien directement. Il fournit les données aux écrans de paramétrage du matériel.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/database';
import { activityService } from '../services/activityService';
import { Tables } from '../../../types/supabase';

export type MaterialType = Tables<'TypeMateriel'>;

interface UseMaterialTypesReturn {
    materialTypes: MaterialType[];
    loading: boolean;
    createMaterialType: (name: string) => Promise<MaterialType | undefined>;
    updateMaterialType: (id: string, name: string) => Promise<void>;
    deleteMaterialType: (id: string) => Promise<void>;
    refresh: () => Promise<void>;
}

/**
 * Ce Hook centralise la gestion de la 'boîte à outils' de la classe.
 */
export const useMaterialTypes = (): UseMaterialTypesReturn => {
    const [materialTypes, setMaterialTypes] = useState<MaterialType[]>([]);
    const [loading, setLoading] = useState(false);

    /**
     * Récupération : va chercher la liste de tout le matériel enregistré par l'enseignant.
     */
    const fetchMaterialTypes = useCallback(async () => {
        setLoading(true);
        try {
            const data = await activityService.getMaterialTypes();
            setMaterialTypes(data);
        } catch (error) {
            console.error("Error fetching material types:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Ajout Express : permet de créer un nouvel objet de matériel (ex: 'Perles').
     * Met à jour l'affichage immédiatement en triant par ordre alphabétique.
     */
    const createMaterialType = async (name: string) => {
        if (!name.trim()) return;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");
            
            const newType = await activityService.createMaterialType(name.trim(), user.id);
            setMaterialTypes(prev => [...prev, newType].sort((a, b) => a.nom.localeCompare(b.nom)));
            return newType;
        } catch (error) {
            console.error("Error creating material type:", error);
            throw error;
        }
    };

    /**
     * Correction : permet de renommer un matériel existant.
     */
    const updateMaterialType = async (id: string, name: string) => {
        if (!name.trim()) return;
        try {
            await activityService.updateMaterialType(id, name.trim());
            setMaterialTypes(prev => prev.map(mt =>
                mt.id === id ? { ...mt, nom: name.trim() } : mt
            ).sort((a, b) => a.nom.localeCompare(b.nom)));
        } catch (error) {
            console.error("Error updating material type:", error);
            throw error;
        }
    };

    /**
     * Nettoyage : supprime définitivement un type de matériel de la liste globale.
     */
    const deleteMaterialType = async (id: string) => {
        try {
            await activityService.deleteMaterialType(id);
            setMaterialTypes(prev => prev.filter(mt => mt.id !== id));
        } catch (error) {
            console.error("Error deleting material type:", error);
            throw error;
        }
    };

    // Chargement automatique de la liste au montage du composant
    useEffect(() => {
        fetchMaterialTypes();
    }, [fetchMaterialTypes]);

    return {
        materialTypes,
        loading,
        createMaterialType,
        updateMaterialType,
        deleteMaterialType,
        refresh: fetchMaterialTypes
    };
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant ouvre la gestion du matériel ou le formulaire de création d'activité.
 * 2. Le Hook charge la liste alphabétique du matériel (ex: Boulier, Ciseaux, Feutres).
 * 3. Si l'enseignant ajoute 'Peinture' :
 *    a. Le Hook vérifie que le nom n'est pas vide pour éviter les erreurs.
 *    b. Il envoie l'ordre de création à la base de données.
 *    c. En retour, il reçoit l'objet créé, l'ajoute à la liste affichée et trie à nouveau par ordre alphabétique.
 * 4. Si l'enseignant supprime un objet :
 *    - L'objet disparaît visuellement de la liste sur l'écran.
 *    - L'ordre de suppression est envoyé à la base de données.
 */
