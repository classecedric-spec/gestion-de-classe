/**
 * Nom du module/fichier : SubBranchItem.tsx
 * 
 * Données en entrée : 
 *   - `subBranch` : Les données de la spécialité (spécialité, photo, branche parente).
 *   - `isSelected` : Indique si cette ligne est l'élément actif à l'écran.
 * 
 * Données en sortie : 
 *   - Un bouton interactif représentant la sous-matière.
 *   - Actions de sélection, modification et suppression.
 * 
 * Objectif principal : Afficher une ligne claire et élégante pour identifier une sous-matière (ex: 'Orthographe') et rappeler à quelle grande matière elle appartient (ex: 'Français').
 * 
 * Ce que ça affiche : 
 *   - Un avatar (logo ou icône).
 *   - Le nom de la spécialité en gras.
 *   - Le nom de la branche parente en plus petit.
 *   - Des boutons de gestion qui apparaissent au survol (Modifier, Supprimer).
 */

import React from 'react';
import { Layers, Edit, X, GitBranch, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { SubBranchWithParent } from '../services/subBranchService';

interface SubBranchItemProps {
    subBranch: SubBranchWithParent;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

/**
 * Représente une "carte" ou une ligne pour une sous-matière dans une liste.
 */
const SubBranchItem: React.FC<SubBranchItemProps> = ({ subBranch, isSelected, onSelect, onEdit, onDelete }) => {
    return (
        <div
            onClick={onSelect}
            className={clsx(
                "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                isSelected
                    ? "selected-state"
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
        >
            {/* -- LOGO OU ICÔNE -- */}
            <div className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                isSelected ? "bg-white/20 text-text-dark" : "bg-background text-primary"
            )}>
                {(subBranch.photo_url || subBranch.photo_base64) ? (
                    <img src={subBranch.photo_url || subBranch.photo_base64} alt={subBranch.nom || ''} className="w-full h-full object-cover" />
                ) : (
                    <Layers size={20} />
                )}
            </div>

            {/* -- TEXTES (NOM ET PARENT) -- */}
            <div className="flex-1 min-w-0">
                <h3 className={clsx(
                    "font-semibold truncate",
                    isSelected ? "text-text-dark" : "text-text-main"
                )}>
                    {subBranch.nom}
                </h3>
                {subBranch.Branche && (
                    <p className={clsx(
                        "text-xs truncate flex items-center gap-1",
                        isSelected ? "text-text-dark/70" : "text-grey-medium"
                    )}>
                        <GitBranch size={10} />
                        {subBranch.Branche.nom}
                    </p>
                )}
            </div>

            {/* -- ACTIONS RAPIDES (MODIFIER) -- */}
            <div className={clsx(
                "flex gap-1 transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <div
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
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

            {/* -- BOUTON SUPPRIMER (FLOTTANT) -- */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer la sous-branche"
            >
                <X size={14} strokeWidth={3} />
            </button>

            {/* FLÈCHE DE DIRECTION */}
            <ChevronRight size={16} className={clsx(
                "transition-transform",
                isSelected ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
            )} />
        </div>
    );
};

export default React.memo(SubBranchItem);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. L'enseignant survole la ligne "Calcul".
 * 2. L'interface s'illumine légèrement et fait apparaître l'icône de modification et la croix de suppression.
 * 3. Si l'enseignant clique sur la ligne :
 *    - La ligne change de couleur (état sélectionné).
 *    - Le programme affiche les détails de "Calcul" dans le panneau à côté.
 * 4. Si l'enseignant clique sur la croix rouge :
 *    - Le système stoppe la sélection et lance directement la procédure de suppression.
 */
