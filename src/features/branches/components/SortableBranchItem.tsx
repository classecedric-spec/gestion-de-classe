/**
 * Nom du module/fichier : SortableBranchItem.tsx
 * 
 * Données en entrée : 
 *   - `branch` : Les données d'une branche (matière principale).
 *   - `isSelected` : Indique si cette branche est actuellement sélectionnée par l'élève/prof.
 * 
 * Données en sortie : 
 *   - Un composant d'affichage interactif (bouton/ligne) capable d'être cliqué, modifié ou déplacé.
 * 
 * Objectif principal : Représenter une matière principale dans une liste latérale, permettre sa sélection pour voir ses détails, et gérer sa réorganisation par glisser-déposer.
 * 
 * Ce que ça affiche : Un bloc contenant une poignée de déplacement, l'icône/photo de la branche, son nom, un bouton de modification et un bouton de suppression "flottant".
 */

import React from 'react';
import { GripVertical, Edit, X, ChevronRight, GitBranch } from 'lucide-react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Database } from '../../../types/supabase';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];

interface SortableBranchItemProps {
    branch: BrancheRow;
    isSelected: boolean;
    onClick: (branch: BrancheRow) => void;
    onEdit: (branch: BrancheRow) => void;
    onDelete: (branch: BrancheRow) => void;
}

const SortableBranchItem: React.FC<SortableBranchItemProps> = ({ branch, isSelected, onClick, onEdit, onDelete }) => {
    /**
     * SYSTÈME DE DÉCORATION ET MOUVEMENT :
     * On utilise `useSortable` pour que cette ligne de matière puisse être déplacée 
     * physiquement par l'utilisateur pour changer l'ordre d'importance des branches.
     */
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: branch.id });

    // Définit le style visuel pendant le déplacement (glissement fluide).
    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
    };

    const photo = branch.photo_url || (branch as any).photo_base64;

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onClick(branch)}
            className={clsx(
                "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer overflow-visible",
                isSelected
                    ? "selected-state"
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface",
                isDragging ? "opacity-50 border-primary dashed" : ""
            )}
        >
            {/* Poignée de saisie (Drag Handle) : on stoppe la propagation pour ne pas déclencher le clic de sélection */}
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

            {/* Logo de la matière ou icône par défaut */}
            <div className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                isSelected ? "bg-white/20 text-text-dark" : "bg-background text-primary"
            )}>
                {photo ? (
                    <img src={photo} alt={branch.nom} className="w-full h-full object-cover" />
                ) : (
                    <GitBranch size={20} />
                )}
            </div>

            {/* Nom de la branche (tronqué s'il est trop long) */}
            <div className="flex-1 min-w-0">
                <h3 className={clsx(
                    "font-semibold truncate",
                    isSelected ? "text-text-dark" : "text-text-main"
                )}>
                    {branch.nom}
                </h3>
            </div>

            {/* Boutons d'action (Modifier) qui apparaissent au survol */}
            <div className={clsx(
                "flex gap-1 transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <div
                    onClick={(e) => { e.stopPropagation(); onEdit(branch); }}
                    className={clsx(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        isSelected
                            ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                            : "text-grey-medium hover:text-white hover:bg-white/10"
                    )}
                    title="Modifier"
                >
                    <Edit size={14} />
                </div>
            </div>

            {/* Bouton de suppression flottant (apparaît au survol dans le coin) */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(branch); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer la branche"
            >
                <X size={14} strokeWidth={3} />
            </button>

            {/* Petite flèche indiquant qu'on peut cliquer pour entrer dans le détail */}
            <ChevronRight size={16} className={clsx(
                "transition-transform",
                isSelected ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
            )} />
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. La liste des matières scolaires (Français, Maths, etc.) est affichée.
 * 2. L'enseignant survole une matière : le cadre s'illumine et un bouton de suppression apparaît.
 * 3. Si l'enseignant clique sur le bouton "Modifier", le programme ouvre un formulaire.
 * 4. Si l'enseignant clique et glisse la poignée à gauche, le bloc se détache et permet de changer sa place dans la liste.
 * 5. Si l'enseignant clique simplement au milieu de la ligne, la matière devient "Sélectionnée" (elle change de couleur) et le programme affiche ses sous-matières sur le côté.
 */
export default React.memo(SortableBranchItem);
