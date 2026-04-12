/**
 * Nom du module/fichier : useMaterials.ts
 * 
 * Données en entrée : 
 *   - L'identifiant de l'enseignant connecté.
 *   - Termes de recherche de l'utilisateur.
 * 
 * Données en sortie : 
 *   - Liste des objets matériels filtrés.
 *   - Actions de gestion (créer, modifier, supprimer).
 *   - État des leçons liées à un objet spécifique.
 * 
 * Objectif principal : Centraliser toute la logique de manipulation du matériel pour les écrans de l'application. Ce hook gère le chargement initial, la recherche en temps réel, et les mises à jour "optimistes" (on change l'écran avant même que le serveur réponde pour que l'app soit ultra-fluide).
 * 
 * Ce que ça pilote : 
 *   - La liste de gauche (recherche et sélection).
 *   - Le panneau de droite (détails et activités liées).
 *   - Les fenêtres de création et de modification.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { materialService, TypeMateriel, MaterialActivity, TypeMaterielInsert, TypeMaterielUpdate } from '../services/materialService';
import { getCurrentUser } from '../../../lib/database';
import { toast } from 'sonner';

/**
 * Hook personnalisé pour orchestrer la gestion du matériel de classe.
 */
export const useMaterials = () => {
    const [materiels, setMateriels] = useState<TypeMateriel[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMateriel, setSelectedMateriel] = useState<TypeMateriel | null>(null);

    // État pour les leçons utilisant le matériel sélectionné
    const [linkedActivities, setLinkedActivities] = useState<MaterialActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);

    /**
     * CHARGEMENT : Récupère la liste complète du matériel.
     */
    const fetchMateriels = useCallback(async () => {
        setLoading(true);
        try {
            const user = await getCurrentUser();
            if (!user) {
                setLoading(false);
                return;
            }
            const data = await materialService.fetchAll(user.id);
            setMateriels(data);
        } catch (error) {
            console.error('Error fetching materiels:', error);
            toast.error('Erreur lors du chargement du matériel');
        } finally {
            setLoading(false);
        }
    }, []);

    // Sélectionne automatiquement le premier matériel de la liste au démarrage
    useEffect(() => {
        if (materiels.length > 0 && !selectedMateriel) {
            setSelectedMateriel(materiels[0]);
        }
    }, [materiels, selectedMateriel]);

    /**
     * RECHERCHE DES LIENS : Trouve les activités liées à un matériel précis.
     */
    const fetchLinkedActivitiesDetails = useCallback(async (id: string | undefined) => {
        if (!id) {
            setLinkedActivities([]);
            return;
        }

        setLoadingActivities(true);
        try {
            const activities = await materialService.fetchLinkedActivities(id);
            setLinkedActivities(activities);
        } catch (error) {
            console.error('Error fetching linked activities:', error);
            setLinkedActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    }, []);

    // Déclenche la recherche des liens dès qu'on change de sélection
    useEffect(() => {
        if (selectedMateriel) {
            fetchLinkedActivitiesDetails(selectedMateriel.id);
        } else {
            setLinkedActivities([]);
        }
    }, [selectedMateriel, fetchLinkedActivitiesDetails]);

    /**
     * CRÉATION : Enregistre un nouvel objet.
     */
    const createMateriel = useCallback(async (materialData: Omit<TypeMaterielInsert, 'user_id'>) => {
        try {
            const user = await getCurrentUser();
            if (!user) throw new Error("Utilisateur non connecté");

            const newMateriel = await materialService.create(materialData, user.id);
            setMateriels(prev => [...prev, newMateriel].sort((a, b) => (a.nom || '').localeCompare(b.nom || '')));
            setSelectedMateriel(newMateriel);
            toast.success('Matériel créé avec succès');
            return true;
        } catch (error) {
            console.error('Error creating material:', error);
            toast.error('Erreur lors de la création');
            return false;
        }
    }, []);

    /**
     * MODIFICATION : Met à jour les infos d'un matériel.
     */
    const updateMateriel = useCallback(async (id: string, materialData: TypeMaterielUpdate) => {
        const previousMateriels = [...materiels];
        const previousSelected = selectedMateriel;

        // Mise à jour OPTIMISTE : On change l'écran tout de suite
        setMateriels(prev =>
            prev.map(m => m.id === id ? { ...m, ...materialData } as TypeMateriel : m).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
        );

        if (selectedMateriel?.id === id) {
            setSelectedMateriel(prev => prev ? ({ ...prev, ...materialData } as TypeMateriel) : null);
        }

        try {
            const updated = await materialService.update(id, materialData);
            // On remplace par les données du serveur pour être sûr
            setMateriels(prev =>
                prev.map(m => m.id === id ? updated : m).sort((a, b) => (a.nom || '').localeCompare(b.nom || ''))
            );

            if (selectedMateriel?.id === id) {
                setSelectedMateriel(updated);
            }

            toast.success('Matériel modifié avec succès');
            return true;
        } catch (error) {
            console.error('Error updating material:', error);
            // En cas d'erreur, on remet tout comme avant (Rollback)
            setMateriels(previousMateriels);
            setSelectedMateriel(previousSelected);
            toast.error('Erreur lors de la modification');
            return false;
        }
    }, [selectedMateriel, materiels]);

    /**
     * SUPPRESSION : Retire un objet de la liste.
     */
    const deleteMateriel = useCallback(async (id: string) => {
        const previousMateriels = [...materiels];
        const previousSelected = selectedMateriel;

        // Mise à jour OPTIMISTE
        const updatedList = materiels.filter(m => m.id !== id);
        setMateriels(updatedList);

        if (selectedMateriel?.id === id) {
            setSelectedMateriel(updatedList.length > 0 ? updatedList[0] : null);
        }

        try {
            await materialService.delete(id);
            toast.success('Matériel supprimé avec succès');
            return true;
        } catch (error: any) {
            console.error('Error deleting material:', error);
            // Retour en arrière si le serveur refuse (ex: matériel utilisé dans une leçon)
            setMateriels(previousMateriels);
            setSelectedMateriel(previousSelected);

            if (error.code === '23503') { // Erreur de contrainte Supabase
                toast.error("Impossible de supprimer : ce matériel est lié à des activités.");
            } else {
                toast.error("Erreur lors de la suppression");
            }
            return false;
        }
    }, [selectedMateriel, materiels]);

    /**
     * FILTRAGE : Liste calculée selon ce que l'enseignant tape dans la barre de recherche.
     */
    const filteredMateriels = useMemo(() => {
        return materiels.filter(m =>
            (m.nom || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (m.acronyme && m.acronyme.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [materiels, searchTerm]);

    // Lancement du chargement au démarrage
    useEffect(() => {
        fetchMateriels();
    }, [fetchMateriels]);

    return {
        materiels,
        loading,
        searchTerm,
        setSearchTerm,
        selectedMateriel,
        setSelectedMateriel,
        filteredMateriels,
        linkedActivities,
        loadingActivities,
        createMateriel,
        updateMateriel,
        deleteMateriel,
        fetchMateriels
    };
};

export default useMaterials;

/**
 * LOGIGRAMME D'ACTION :
 * 
 * 1. ACTION -> L'utilisateur clique sur "Supprimer" pour une 'Tablette'.
 * 2. VISUEL -> L'application cache immédiatement la tablette de l'écran (effet optimiste).
 * 3. SERVEUR -> Une commande est envoyée au serveur pour supprimer la ligne.
 * 4. CONTRÔLE -> 
 *    - Si SUCCÈS : On reste tel quel, l'utilisateur a eu une expérience instantanée.
 *    - Si ÉCHEC (ex: tablette liée à un prêt) : L'application fait réapparaître l'objet et affiche un message d'erreur expliquant pourquoi.
 */
