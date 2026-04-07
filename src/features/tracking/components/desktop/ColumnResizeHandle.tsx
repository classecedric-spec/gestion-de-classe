/**
 * Nom du module/fichier : ColumnResizeHandle.tsx
 * 
 * Données en entrée : 
 *   - `orientation` : Indique si la poignée est à tirer vers la gauche/droite (verticale) ou vers le haut/bas (horizontale).
 *   - `onMouseDown` : La fonction qui s'active quand on attrape la poignée avec la souris.
 *   - `isEditMode` : Booléen qui indique si l'enseignant est en train de "modifier sa vue" ou non.
 * 
 * Données en sortie : 
 *   - Une fine ligne interactive située entre deux colonnes ou entre deux rangées.
 * 
 * Objectif principal : Offrir une souplesse totale à l'enseignant pour organiser son écran. Si sa liste de demandes d'aide est longue, il peut agrandir la colonne n°2 en tirant sur cette poignée. C'est le même principe qu'agrandir une image ou une fenêtre Word.
 * 
 * Ce que ça affiche : Une ligne quasi invisible par défaut, qui s'illumine en bleu et montre une double flèche quand on passe dessus en mode Édition.
 */

import React from 'react';
import clsx from 'clsx';

export type Orientation = 'vertical' | 'horizontal';

interface ColumnResizeHandleProps {
    orientation?: Orientation;
    onMouseDown: (event: React.MouseEvent) => void;
    isEditMode: boolean;
}

/**
 * Poignée interactive pour redimensionner les zones du tableau de bord.
 */
const ColumnResizeHandle = React.memo<ColumnResizeHandleProps>(({
    orientation = 'vertical',
    onMouseDown,
    isEditMode
}) => {
    const isVertical = orientation === 'vertical';

    return (
        <div
            onMouseDown={onMouseDown}
            className={clsx(
                "transition-all duration-300 shrink-0 group flex items-center justify-center relative z-50",
                isVertical
                    ? "w-4 -mx-1.5 h-full cursor-col-resize hover:bg-primary/10" // Marge fine et curseur de redimensionnement latéral
                    : "w-full h-4 -my-1.5 cursor-row-resize hover:bg-primary/10", // Marge fine et curseur de redimensionnement de haut en bas
                // CACHÉ : La poignée est désactivée quand on n'est pas en mode édition pour éviter les erreurs.
                !isEditMode && "opacity-0 pointer-events-none"
            )}
            title="Glisser pour redimensionner"
        >
            {/* Ligne visuelle qui aide à viser la poignée */}
            <div className={clsx(
                "bg-white/20 group-hover:bg-primary rounded-full transition-colors",
                isVertical ? "w-1 h-8" : "w-12 h-1" // Trait vertical ou horizontal selon l'usage
            )} />
        </div>
    );
});

// Nom technique du composant pour le débogage.
ColumnResizeHandle.displayName = 'ColumnResizeHandle';

export default ColumnResizeHandle;

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. ACTION : L'enseignant clique sur le bouton "Ajuster Layout" (écrou) en bas du dashboard.
 * 2. ACTIVATION : `isEditMode` devient vrai. Les poignées, jusqu'ici invisibles, apparaissent entre les colonnes.
 * 3. SAISIE : L'enseignant veut voir plus d'élèves. Il place sa souris entre la colonne 1 et 2.
 * 4. MOUVEMENT : Il appuie sur le clic gauche et déplace sa souris vers la droite.
 * 5. RÉACTION : La colonne de gauche s'étire et celle de droite se contracte en temps réel.
 * 6. FIN : Il relâche le clic. L'application enregistre immédiatement cette nouvelle largeur pour qu'il la retrouve identique demain.
 */
