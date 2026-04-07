/**
 * Nom du module/fichier : MaterialItem.tsx
 * 
 * Données en entrée : 
 *   - `materiel` : Les informations d'un objet (nom, acronyme).
 *   - `isSelected` : Vrai si cet objet est celui qu'on regarde actuellement.
 * 
 * Données en sortie : 
 *   - Déclenchement d'actions : Sélectionner (`onSelect`), Modifier (`onEdit`), Supprimer (`onDelete`).
 * 
 * Objectif principal : Représenter une ligne interactive dans la liste du matériel. Ce composant est conçu pour être compact mais informatif, avec des boutons de gestion qui apparaissent quand on passe la souris dessus.
 * 
 * Ce que ça affiche : 
 *   - Une icône de "paquet" (Package).
 *   - Le nom de l'objet (ex: 'Ordinateur').
 *   - L'acronyme s'il existe (ex: 'PC1').
 *   - Des boutons discrets pour modifier ou supprimer.
 */

import React from 'react';
import { Package, Edit, X } from 'lucide-react';
import clsx from 'clsx';
import { TypeMateriel } from '../services/materialService';

// Petite icône de flèche pour indiquer la sélection
interface ChevronRightProps {
    size: number;
    className?: string;
}

const ChevronRight: React.FC<ChevronRightProps> = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);

interface MaterialItemProps {
    materiel: TypeMateriel;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

/**
 * Composant représentant une ligne individuelle de matériel.
 */
const MaterialItem: React.FC<MaterialItemProps> = ({ materiel, isSelected, onSelect, onEdit, onDelete }) => {
    return (
        <div
            className={clsx(
                "w-full flex items-center rounded-xl transition-all border group relative hover:z-50",
                isSelected
                    ? "selected-state border-transparent" 
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
            )}
        >
            {/* ZONE PRINCIPALE : Sélection de l'item (Bouton séparé pour l'accessibilité) */}
            <button
                onClick={onSelect}
                className="flex-1 flex items-center gap-4 p-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                title={`Voir les détails de ${materiel.nom}`}
            >
                {/* Icône à gauche */}
                <div className={clsx(
                    "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                    isSelected ? "bg-white/20 text-text-dark" : "bg-background text-primary"
                )}>
                    <Package size={20} />
                </div>

                {/* Texte au centre */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h3 className={clsx(
                            "font-semibold truncate",
                            isSelected ? "text-text-dark" : "text-text-main"
                        )}>
                            {materiel.nom}
                        </h3>
                        {/* Affichage de l'acronyme (ex: PC1, T1...) */}
                        {materiel.acronyme && (
                            <span className={clsx(
                                "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border",
                                isSelected
                                    ? "bg-black/20 text-white/80 border-black/10"
                                    : "bg-primary/10 text-primary border-primary/20"
                            )}>
                                {materiel.acronyme}
                            </span>
                        )}
                    </div>
                </div>

                {/* Flèche de sélection à droite */}
                <ChevronRight size={16} className={clsx(
                    "transition-transform shrink-0",
                    isSelected ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                )} />
            </button>

            {/* ZONE D'ACTIONS : Modifier / Supprimer (Absolue ou à droite du bouton principal) */}
            <div className={clsx(
                "absolute right-10 top-1/2 -translate-y-1/2 flex gap-1 transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <button
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
                </button>
            </div>

            {/* Bouton de suppression (toujours à l'extérieur car positionné en haut-droite) */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer"
            >
                <X size={14} strokeWidth={3} />
            </button>
        </div>
    );
};

export default React.memo(MaterialItem);

/**
 * LOGIGRAMME VISUEL :
 * 
 * 1. REPOS -> L'objet est affiché normalement dans la liste.
 * 2. SURVOL -> SI la souris passe dessus : Les boutons "Modifier" et "Supprimer" apparaissent.
 * 3. CLIC -> SI on clique sur la ligne : L'application change la sélection pour montrer les détails à droite.
 * 4. ACTION -> SI on clique sur un bouton (X ou Edit) : L'action correspondante se lance sans changer la sélection de la liste.
 */
