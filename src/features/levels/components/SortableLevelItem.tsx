/**
 * Nom du module/fichier : SortableLevelItem.tsx
 * 
 * Données en entrée : 
 *   - `level` : Les données d'un niveau scolaire particulier (nom, ID).
 *   - `index` : La position actuelle du niveau dans la liste (0, 1, 2...).
 *   - `isSelected` : Indique si l'enseignant a cliqué sur ce niveau pour voir ses détails.
 * 
 * Données en sortie : 
 *   - Un bouton interactif capable de réagir aux clics et aux déplacements.
 * 
 * Objectif principal : Créer une "ligne de niveau" visuelle et mobile. Elle permet de sélectionner le niveau, de le modifier, de le supprimer ou de le faire glisser pour changer l'ordre hiérarchique des classes.
 * 
 * Ce que ça affiche : Une ligne contenant une poignée de déplacement (Grip), le numéro d'ordre, le nom du niveau, une flèche et un bouton de suppression qui apparaît au survol.
 */

import React from 'react';
import { GripVertical, Edit, X, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { LevelWithStudentCount } from '../../../types';

interface SortableLevelItemProps {
    level: LevelWithStudentCount;
    index: number;
    isSelected: boolean;
    onClick: (level: LevelWithStudentCount) => void;
    onEdit: (level: LevelWithStudentCount) => void;
    onDelete: (level: LevelWithStudentCount) => void;
}

const SortableLevelItem: React.FC<SortableLevelItemProps> = ({ level, index, isSelected, onClick, onEdit, onDelete }) => {
    /**
     * SYSTÈME DE MOUVEMENT (Hook useSortable) :
     * Permet à ce composant d'être "conscient" de sa place dans la liste 
     * et de réagir lorsqu'on essaie de le faire glisser.
     */
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: level.id });

    // Calcule la transformation visuelle (décalage) pendant le glissement.
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onClick(level)}
            className={clsx(
                "group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:z-50",
                isSelected
                    ? "selected-state"
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface",
                isDragging ? "opacity-50 border-primary dashed" : ""
            )}
        >
            {/* Poignée de saisie : Permet d'attraper le bloc sans déclencher le clic de sélection */}
            <div
                {...attributes}
                {...listeners}
                className={clsx(
                    "cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors outline-none",
                    isSelected
                        ? "text-text-dark/50 hover:text-text-dark hover:bg-text-dark/10"
                        : "text-grey-medium hover:text-white hover:bg-white/5"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={16} />
            </div>

            {/* Pastille affichant le numéro de position (1, 2, 3...) */}
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors shadow-inner",
                isSelected
                    ? "bg-white/20 text-text-dark"
                    : "bg-background text-primary group-hover:bg-white/10 group-hover:text-white"
            )}>
                {index + 1}
            </div>

            {/* Nom du niveau scolaire */}
            <div className="flex-1 min-w-0">
                <h3 className={clsx(
                    "font-bold text-sm truncate transition-colors",
                    isSelected ? "text-text-dark" : "text-text-main"
                )}>
                    {level.nom}
                </h3>
            </div>

            {/* Petit bouton d'édition (crayon) qui apparaît au survol */}
            <div className={clsx(
                "flex gap-1 transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(level); }}
                    className={clsx(
                        "p-1.5 rounded-lg transition-colors",
                        isSelected
                            ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                            : "text-grey-medium hover:text-white hover:bg-white/10"
                    )}
                    title="Modifier"
                >
                    <Edit size={14} />
                </button>
            </div>

            {/* Flèche de sélection sur le côté droit */}
            <ChevronRight size={16} className={clsx(
                "transition-transform ml-2",
                isSelected ? "text-text-dark translate-x-0" : "text-grey-dark group-hover:text-white"
            )} />

            {/* Bouton de suppression flottant (Croix rouge qui dépasse du cadre au survol) */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(level); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer le niveau"
            >
                <X size={14} strokeWidth={3} />
            </button>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant voit la ligne "CP" dans sa liste.
 * 2. ACTION SÉLECTION : S'il clique n'importe où sur la ligne, le niveau passe en couleur "Sélectionné".
 * 3. ACTION RÉORGANISATION : S'il attrape la poignée de gauche, il peut faire monter ou descendre la ligne "CP".
 * 4. ACTION MODIFICATION : Au survol, une petite icône "Crayon" apparaît pour renommer le niveau.
 * 5. ACTION SUPPRESSION : Au survol, une petite croix rouge apparaît dans le coin supérieur pour effacer le niveau.
 * 6. RETOUR VISUEL : L'ordinateur affiche le numéro d'ordre (ex: 1, 2, 3) pour aider l'enseignant à se repérer.
 */
export default React.memo(SortableLevelItem);
