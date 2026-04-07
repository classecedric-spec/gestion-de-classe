/**
 * Nom du module/fichier : useTimerIntegration.ts
 * 
 * Données en entrée : 
 *   - `timer` : L'état global du chronomètre (temps restant, message, actif/inactif). 
 * 
 * Données en sortie : 
 *   - `showTimerModal` : Est-ce qu'on doit afficher la fenêtre de réglage du temps ?
 *   - `isFullScreen` : Indique si le chronomètre est affiché en plein écran (pour le TBI).
 *   - `formatTime` : Transforme les secondes en format lisible (00:00).
 * 
 * Objectif principal : Faire le lien entre le "Moteur" du temps (le chronomètre qui tourne) et "l'Écran" (l'affichage utilisateur). C'est un adaptateur qui s'assure que le temps est bien formaté pour être joli à l'écran et qui gère les fenêtres surgissantes et le mode plein écran pour que les élèves voient bien le décompte sur le tableau blanc. 
 * 
 * Ce que ça contient : 
 *   - La mémorisation de l'état "Plein écran".
 *   - La gestion de l'ouverture de la fenêtre de réglage.
 *   - Une fonction de formatage du temps (MM:SS).
 */

import { useState } from 'react';

export interface Timer {
    active: boolean; // Est-ce qu'il tourne ?
    timeLeft: number; // Secondes restantes
    duration: number; // Durée totale
    message?: string; // Message à afficher
}

/**
 * Hook d'intégration du Timer pour l'affichage (Dashboard).
 */
export function useTimerIntegration(timer: Timer) {
    // ÉTATS : Réglages d'affichage
    const [showTimerModal, setShowTimerModal] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    /** 
     * MOULINETTE DE FORMATAGE : 
     * Transforme 360 secondes en "6:00".
     */
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return {
        states: {
            showTimerModal,
            isFullScreen,
            timer
        },
        actions: {
            setShowTimerModal,
            setIsFullScreen,
            formatTime
        }
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ARRIVÉE : L'enseignant veut lancer un défi de 2 minutes.
 * 2. ACTION : Le hook `useTimerIntegration` ouvre la petite fenêtre de réglage (`setShowTimerModal`).
 * 3. START : Une fois réglé, le chrono commence à décompter (reçu via `timer`).
 * 4. TBI : L'enseignant appuie sur le bouton "Agrandir". `setIsFullScreen` passe au vert.
 * 5. AFFICHAGE : Les élèves voient "2:00" sur tout l'écran, puis "1:59"...
 * 6. FIN : L'enseignant peut fermer la fenêtre agrandie une fois le défi terminé.
 */
