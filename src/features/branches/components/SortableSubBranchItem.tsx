/**
 * Nom du module/fichier : SortableSubBranchItem.tsx
 * 
 * Données en entrée : 
 *   - `sub` : Un objet contenant les informations d'une sous-branche (nom, photo, etc.).
 * 
 * Données en sortie : 
 *   - Un composant d'affichage "ligne" capable d'être déplacé à la souris pour réorganiser une liste.
 * 
 * Objectif principal : Représenter visuellement une sous-matière dans une liste, tout en permettant à l'enseignant de la faire glisser pour changer l'ordre d'affichage.
 * 
 * Ce que ça affiche : Une ligne contenant une poignée de saisie (grip), l'icône ou la photo de la sous-matière, et son nom.
 */

import React from 'react';
import { GitBranch, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Database } from '../../../types/supabase';

type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];

interface SortableSubBranchItemProps {
    sub: SousBrancheRow;
}

const SortableSubBranchItem: React.FC<SortableSubBranchItemProps> = ({ sub }) => {
    /**
     * ASSISTANT DE MOUVEMENT (Hook useSortable) :
     * On branche ce composant sur le système de "Drag & Drop". 
     * Il nous fournit les "listeners" (écouteurs) pour capter le clic de la souris
     * et les "attributes" pour que l'ordinateur comprenne que c'est un bloc mobile.
     */
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sub.id });

    // Calcule la position visuelle du bloc pendant qu'il "flotte" ou se déplace.
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    const photo = sub.photo_url || (sub as any).photo_base64;

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                "flex items-center gap-3 p-4 bg-surface/50 rounded-xl border transition-colors",
                isDragging ? "opacity-50 border-primary dashed" : "border-white/5 hover:border-white/10"
            )}
        >
            {/* La poignée permettant d'attraper le bloc avec la souris */}
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-grey-medium hover:text-white hover:bg-white/5 outline-none"
            >
                <GripVertical size={16} />
            </div>

            {/* Affichage de l'image ou de l'icône par défaut */}
            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-primary shrink-0 overflow-hidden shadow-inner">
                {photo ? (
                    <img src={photo} alt={sub.nom} className="w-full h-full object-cover" />
                ) : (
                    <GitBranch size={18} />
                )}
            </div>
            {/* Nom de la sous-branche */}
            <span className="font-semibold text-text-main truncate">{sub.nom}</span>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. La liste des sous-matières s'affiche. L'ordinateur dessine chaque `SortableSubBranchItem`.
 * 2. L'enseignant clique sur la petite icône de poignée (Grip) à gauche du nom "Géométrie".
 * 3. Le système de "Drag & Drop" s'active : le bloc devient semi-transparent.
 * 4. Tant que l'enseignant déplace sa souris, le bloc suit le mouvement grâce aux calculs de `transform`.
 * 5. Une fois relâché, le composant reprend sa place normale, et la liste globale mémorise sa nouvelle position.
 */
export default React.memo(SortableSubBranchItem);
