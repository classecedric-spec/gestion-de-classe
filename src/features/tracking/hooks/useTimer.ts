/**
 * Nom du module/fichier : useTimer.ts
 * 
 * Données en entrée : 
 *   - Une durée en secondes (ex: 300 pour 5 minutes).
 *   - Un message personnalisé (ex: "Fin du rangement !").
 * 
 * Données en sortie : 
 *   - `timer` : Objet contenant le temps restant et l'état (actif ou non).
 *   - `timerFinished` : Un signal qui passe à "Vrai" quand le temps est écoulé.
 *   - `formatTime` : Une petite moulinette qui transforme 125 secondes en "2:05".
 * 
 * Objectif principal : Gérer le compte à rebours de la classe. Ce hook est un chronomètre intelligent qui fait vivre le temps à l'écran. Il s'occupe de décompter les secondes une par une, de déclencher une vibration sur les tablettes quand c'est fini, et d'afficher un message d'alerte pour les élèves. 
 * 
 * Ce que ça contient : 
 *   - La logique de décompte (le "TIC-TAC" toutes les 1000ms).
 *   - La mise en forme du texte (MM:SS).
 *   - Le déclencheur visuel de fin de minuteur.
 */

import { useState, useEffect, useCallback } from 'react';

export interface TimerState {
    active: boolean; // Est-ce que ça tourne ?
    timeLeft: number; // Secondes restantes
    duration: number; // Durée totale choisie au départ
    message?: string; // Petit mot doux (ex: "On change d'atelier !")
}

/**
 * Hook de pilotage du chronomètre de classe.
 */
export function useTimer() {
    // ÉTAT : Les entrailles du chrono
    const [timer, setTimer] = useState<TimerState>({
        active: false,
        duration: 0,
        timeLeft: 0,
        message: ''
    });

    // ÉTATS : Interface (Est-ce qu'on montre la fenêtre de fin ? La fenêtre de réglage ?)
    const [timerFinished, setTimerFinished] = useState(false);
    const [showTimerModal, setShowTimerModal] = useState(false);

    /** 
     * LE MOTEUR DU CHRONO : 
     * Toutes les secondes, si le chrono est actif, on retire 1.
     */
    useEffect(() => {
        if (!timer.active) return;

        const interval = setInterval(() => {
            setTimer(prev => {
                // SI C'EST FINI (0 seconde) : 
                if (prev.timeLeft <= 1) {
                    clearInterval(interval);
                    // On attend un tout petit peu avant d'allumer le signal de fin.
                    setTimeout(() => {
                        setTimerFinished(true);
                        // VIBRATION : Si la tablette le permet, elle vibre.
                        if ('vibrate' in navigator) {
                            navigator.vibrate([200, 100, 200]);
                        }
                    }, 0);
                    return { ...prev, timeLeft: 0, active: false };
                }
                // SINON : On retire une seconde.
                return { ...prev, timeLeft: prev.timeLeft - 1 };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [timer.active]);

    /** 
     * ACTIONS : Démarrage, arrêt, et nettoyage.
     */
    const startTimer = useCallback((duration: number, message: string) => {
        setTimer({
            active: true,
            duration,
            timeLeft: duration,
            message
        });
        setShowTimerModal(false);
    }, []);

    const closeTimerFinished = useCallback(() => {
        setTimerFinished(false);
        setTimer(prev => ({ ...prev, message: '' }));
    }, []);

    /** 
     * PETITE MOULINETTE PÉDAGOGIQUE : 
     * Transforme les secondes brutes en un format lisible par tout le monde.
     * Ex: 65 -> "1:05"
     */
    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    return {
        timer,
        timerFinished,
        showTimerModal,
        setShowTimerModal,
        startTimer,
        closeTimerFinished,
        formatTime,
        setTimer,
        setTimerFinished
    };
}

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant règle le chrono sur 10 minutes pour le rangement.
 * 2. START : Le hook `useTimer` s'active. Le "Tic-Tac" commence.
 * 3. CALCUL : Toutes les secondes, 600 devient 599, puis 598...
 * 4. ETAPE : À l'écran, `formatTime` affiche "10:00", puis "9:59"... 
 * 5. ALERTE : Arrivé à 0, le signal `timerFinished` passe au rouge.
 * 6. RÉSULTAT : Une alerte sonore/visuelle prévient les élèves : "Fin du rangement !".
 */
