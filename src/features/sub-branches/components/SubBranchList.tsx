/**
 * Nom du module/fichier : SubBranchList.tsx
 * 
 * Données en entrée : 
 *   - `subBranches` : Liste de toutes les spécialités enregistrées.
 *   - `selectedSubBranch` : La spécialité actuellement visualisée.
 *   - `loading` : État de chargement des données.
 * 
 * Données en sortie : 
 *   - Une liste ordonnée et interactive de cartes `SubBranchItem`.
 *   - Actions de sélection, ajout, édition et suppression.
 * 
 * Objectif principal : Afficher l'intégralité des sous-matières de l'enseignant sous forme d'une liste verticale simple et efficace. Elle sert de menu de navigation pour explorer les détails de chaque spécialité.
 * 
 * Ce que ça affiche : 
 *   - Un bouton "Nouvelle Sous-branche" en haut.
 *   - Une icône de chargement si les données arrivent.
 *   - Un message "Aucune sous-branche trouvée" si la liste est vide.
 *   - Une succession de lignes (SubBranchItem) sinon.
 */

import React from 'react';
import { Layers, Plus } from 'lucide-react';
import SubBranchItem from './SubBranchItem';
import { SubBranchWithParent } from '../services/subBranchService';
import { CardList, Avatar, EmptyState } from '../../../core';

interface SubBranchListProps {
    subBranches: SubBranchWithParent[];
    loading: boolean;
    selectedSubBranch: SubBranchWithParent | null;
    onSelect: (sb: SubBranchWithParent) => void;
    onOpenAdd: () => void;
    onEdit: (sb: SubBranchWithParent) => void;
    onDelete: (sb: SubBranchWithParent) => void;
}

/**
 * Composant conteneur pour afficher la liste des sous-matières dans la barre latérale.
 */
const SubBranchList: React.FC<SubBranchListProps> = ({
    subBranches,
    loading,
    selectedSubBranch,
    onSelect,
    onOpenAdd,
    onEdit,
    onDelete
}) => {
    return (
        <CardList
            actionLabel="Nouvelle Sous-branche"
            onAction={onOpenAdd}
            actionIcon={Plus}
        >
            {/* -- ÉTAPE 1 : CHARGEMENT -- */}
            {loading ? (
                <div className="flex justify-center p-8">
                    <Avatar loading size="md" initials="" />
                </div>
            ) : subBranches.length === 0 ? (
                /* -- ÉTAPE 2 : LISTE VIDE -- */
                <EmptyState
                    icon={Layers}
                    title="Aucune sous-branche"
                    description="Aucune sous-branche trouvée."
                    size="sm"
                />
            ) : (
                /* -- ÉTAPE 3 : AFFICHAGE DES LIGNES -- */
                <div className="space-y-1">
                    {subBranches.map((subBranch) => (
                        <SubBranchItem
                            key={subBranch.id}
                            subBranch={subBranch}
                            isSelected={selectedSubBranch?.id === subBranch.id}
                            onSelect={() => onSelect(subBranch)}
                            onEdit={() => onEdit(subBranch)}
                            onDelete={() => onDelete(subBranch)}
                        />
                    ))}
                </div>
            )}
        </CardList>
    );
};

export default React.memo(SubBranchList);

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le panneau des sous-branches s'ouvre.
 * 2. L'ordinateur vérifie s'il est en train de "réfléchir" (chargement). Si oui, il montre un cercle qui tourne.
 * 3. Une fois les données arrivées, s'il n'y a rien, il affiche un message d'aide pour inviter à créer la première.
 * 4. S'il y a des spécialités, il les dessine une par une en utilisant le modèle `SubBranchItem`.
 * 5. Si l'enseignant clique sur le gros bouton "+" en haut, le programme lance la procédure d'ajout.
 */
