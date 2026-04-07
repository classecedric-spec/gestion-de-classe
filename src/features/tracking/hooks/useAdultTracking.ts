/**
 * Nom du module/fichier : useAdultTracking.ts
 * 
 * Données en entrée : 
 *   - L'état de connexion (via `useOfflineSync`) pour savoir si on peut enregistrer immédiatement ou s'il faut attendre.
 *   - La date du jour (calculée automatiquement).
 * 
 * Données en sortie : 
 *   - `adultActivities` : La liste des actions effectuées par les adultes aujourd'hui (ex: "AESH : Aide à la lecture").
 *   - `allAdults` : La liste des intervenants (Enseignants, AESH, ATSEM).
 *   - `availableActivityTypes` : Les types d'actions possibles (Auteur, Aide, Observation, etc.).
 *   - `actions` : Fonctions pour ajouter ou supprimer un suivi d'adulte.
 * 
 * Objectif principal : Garder une trace du travail des adultes dans la classe. Ce hook permet d'enregistrer qui a fait quoi et avec qui. C'est essentiel pour le bilan de fin de séance ou pour justifier des interventions d'aide humaine spécialisée. Il gère aussi le mode "hors-ligne" : si le Wi-fi de l'école coupe, l'action est mise en attente et sera enregistrée automatiquement quand internet reviendra.
 * 
 * Ce que ça contient : 
 *   - Le chargement des données de suivi pour la journée en cours.
 *   - La logique d'ajout d'une tâche (avec gestion de la file d'attente hors-ligne).
 *   - La suppression d'une entrée en cas d'erreur.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/database';
import { fetchWithCache } from '../../../lib/sync';
import { useOfflineSync } from '../../../context/OfflineSyncContext';
import { toast } from 'sonner';

import { adultService, Adult, ActivityType, AdultActivity } from '../../adults/services/adultService';

/**
 * Hook de pilotage du suivi des adultes (Enseignants, AESH, etc.).
 */
export function useAdultTracking() {
    const { isOnline, addToQueue } = useOfflineSync();

    // ÉTATS : Données de suivi et réglages
    const [adultActivities, setAdultActivities] = useState<AdultActivity[]>([]);
    const [allAdults, setAllAdults] = useState<Adult[]>([]);
    const [availableActivityTypes, setAvailableActivityTypes] = useState<ActivityType[]>([]);
    const [showAdultModal, setShowAdultModal] = useState(false);
    const [loadingAdults, setLoadingAdults] = useState(false);
    const [currentAdultSelection, setCurrentAdultSelection] = useState<string | null>(null);
    const [currentActivityTypeSelection, setCurrentActivityTypeSelection] = useState<string | null>(null);

    /** 
     * CHARGEMENT : 
     * Récupère ce qui a déjà été noté pour aujourd'hui.
     */
    const fetchAdultTracking = async () => {
        await fetchWithCache(
            'adult_tracking_today',
            async () => {
                const today = new Date().toISOString().split('T')[0];
                return await adultService.fetchAdultActivities(today);
            },
            (data) => setAdultActivities(data as AdultActivity[]),
            (_err) => { }
        );
    };

    /** 
     * LISTES DE RÉFÉRENCE : 
     * Charge les noms des adultes et les types de tâches possibles.
     */
    const fetchAllAdults = async () => {
        await fetchWithCache(
            'all_adults',
            async () => {
                return await adultService.fetchAllAdults();
            },
            (data) => setAllAdults(data as Adult[]),
            (_err) => { }
        );
    };

    const fetchActivityTypes = async () => {
        await fetchWithCache(
            'activity_types_adult',
            async () => {
                return await adultService.fetchActivityTypes();
            },
            (data) => setAvailableActivityTypes(data as ActivityType[]),
            (_err) => { }
        );
    };

    /** 
     * ACTION : Enregistrer une intervention.
     */
    const handleAddAdultActivity = async (adulteId: string, activiteId: string) => {
        setLoadingAdults(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const userId = user?.id;

            // GESTION HORS-LIGNE : 
            // Si pas d'internet, on ne bloque pas l'enseignant, on met la tâche "au chaud" dans une file d'attente.
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'SuiviAdulte',
                    method: 'insert',
                    payload: { adulte_id: adulteId, activite_id: activiteId, user_id: userId },
                    contextDescription: `Ajout tâche adulte`
                });
                setShowAdultModal(false);
                toast.success("Tâche ajoutée (hors-ligne)");
                return;
            }

            // Si on est en ligne, on enregistre pour de vrai.
            await adultService.addActivity(adulteId, activiteId, userId || '');

            setShowAdultModal(false);
            fetchAdultTracking();
            toast.success("Action enregistrée");
        } catch (error: any) {
            toast.error("Erreur: " + error.message);
        } finally {
            setLoadingAdults(false);
        }
    };

    /** 
     * SUPPRESSION : 
     * Retire une intervention de la liste (ex: erreur de saisie).
     */
    const handleDeleteAdultSuivi = async (id: string) => {
        try {
            if (!isOnline) {
                addToQueue({
                    type: 'SUPABASE_CALL',
                    table: 'SuiviAdulte',
                    method: 'delete',
                    payload: null,
                    match: { id },
                    contextDescription: "Suppression tâche"
                });
                setAdultActivities(prev => prev.filter(p => p.id !== id));
                toast.success("Suppression en file d'attente");
                return;
            }

            await adultService.deleteSuivi(id);
            fetchAdultTracking();
            toast.success("Retiré");
        } catch (error) {
            toast.error("Erreur");
        }
    };

    // Initialisation automatique au chargement de la page.
    useEffect(() => {
        fetchAdultTracking();
        fetchAllAdults();
        fetchActivityTypes();
    }, []);

    return {
        states: { adultActivities, allAdults, availableActivityTypes, showAdultModal, loadingAdults, currentAdultSelection, currentActivityTypeSelection },
        actions: { setShowAdultModal, setCurrentAdultSelection, setCurrentActivityTypeSelection, handleAddAdultActivity, handleDeleteAdultSuivi }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : Mme Durand (AESH) arrive pour aider Lucas en lecture. 
 * 2. CLIC : L'enseignant clique sur le bouton "Adultes" du Dashboard.
 * 3. SELECTION : Il choisit "Mme Durand" et "Lecture".
 * 4. ENREGISTREMENT : Le hook `useAdultTracking` envoie l'info au serveur.
 * 5. AFFICHAGE : Une petite ligne apparait dans la colonne de droite : "Mme Durand - Lecture".
 * 6. POINT DE CONTRÔLE : En fin de journée, l'enseignant peut consulter cette liste pour son journal de classe.
 */
