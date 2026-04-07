/**
 * Nom du module/fichier : TimerDisplay.tsx
 * 
 * Données en entrée : 
 *   - `timer` : Objet contenant l'état du chronomètre (actif, temps restant).
 *   - `formatTime` : Fonction utilitaire pour transformer des secondes en texte (ex: 120 -> "02:00").
 *   - `onClick` : Action pour ouvrir les réglages du chronomètre.
 * 
 * Données en sortie : 
 *   - Un bouton compact qui affiche soit une icône d'horloge, soit le décompte en temps réel.
 * 
 * Objectif principal : Fournir un indicateur temporel discret mais lisible sur le tableau de bord. L'enseignant doit pouvoir savoir en un quart de seconde combien de temps il reste avant la fin de l'atelier, pour anticiper le rangement ou la rotation des groupes.
 * 
 * Ce que ça affiche : 
 *   - Une icône d'horloge grise quand le chrono est arrêté.
 *   - Le temps restant en noir sur fond bleu scintillant quand le chrono tourne.
 */

import React from 'react';
import { Clock } from 'lucide-react';
import clsx from 'clsx';
import { Timer } from '../../hooks/useTimerIntegration';

interface TimerDisplayProps {
    timer: Timer;
    formatTime: (seconds: number) => string;
    onClick: () => void;
}

/**
 * Bouton d'affichage et de contrôle du minuteur de classe.
 */
const TimerDisplay = React.memo<TimerDisplayProps>(({ timer, formatTime, onClick }) => {
    return (
        <button
            onClick={onClick}
            className={clsx(
                "p-2.5 rounded-xl border flex items-center justify-center transition-all shadow-2xl backdrop-blur-xl min-w-[46px]",
                timer.active
                    ? "bg-primary text-black border-primary"
                    : "bg-surface/60 text-grey-medium border-white/10 hover:border-primary/50 hover:text-white"
            )}
            title="Minuteur"
        >
            {timer.active ? (
                // AFFICHAGE ACTIF : On montre les chiffres qui défilent.
                <span className="text-sm font-mono font-bold">{formatTime(timer.timeLeft)}</span>
            ) : (
                // AFFICHAGE REPOS : On montre juste l'icône.
                <Clock size={20} />
            )}
        </button>
    );
});

// Nom technique du composant pour le débogage.
TimerDisplay.displayName = 'TimerDisplay';

export default TimerDisplay;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. REPOS : L'atelier n'a pas commencé. Le bouton affiche une petite horloge grise en bas de l'écran.
 * 2. ACTION : L'enseignant clique sur l'horloge et règle 15 minutes.
 * 3. DÉMARRAGE : Le bouton devient bleu vif et affiche "15:00".
 * 4. DÉCOMPTE : Chaque seconde, le texte change : "14:59", "14:58", etc.
 * 5. ALERTE : Quand il reste peu de temps, l'enseignant le voit immédiatement car la couleur bleue attire l'œil sur le fond sombre du dashboard.
 * 6. FIN : Une fois à zéro, l'enseignant peut cliquer à nouveau pour éteindre le chrono ou le relancer.
 */
