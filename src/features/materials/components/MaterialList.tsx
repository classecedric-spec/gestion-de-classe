/**
 * Nom du module/fichier : MaterialList.tsx
 * 
 * Données en entrée : 
 *   - `materiels` : Liste des objets (tablettes, règles, compas) à afficher.
 *   - `loading` : État de chargement (affiche un indicateur qui tourne).
 *   - `selectedMateriel` : L'objet actuellement sélectionné pour voir ses détails.
 * 
 * Données en sortie : 
 *   - Déclenchement d'actions : Sélectionner (`onSelect`), Créer (`onOpenAdd`), Modifier (`onOpenEdit`), Supprimer (`onDelete`).
 * 
 * Objectif principal : Afficher la colonne de gauche de l'écran Matériel. Cette liste permet à l'enseignant de voir d'un coup d'œil tout son équipement, de faire une recherche (via le parent) et de choisir un objet pour en savoir plus.
 * 
 * Ce que ça affiche : 
 *   - Un bouton "Nouveau Matériel" en haut.
 *   - Un indicateur de chargement si les données arrivent.
 *   - Une série de "lignes" (`MaterialItem`) représentant chaque objet.
 *   - Un message "Aucun matériel" si la liste est vide.
 */

import React from 'react';
import { Package, Plus } from 'lucide-react';
import MaterialItem from './MaterialItem';
import { TypeMateriel } from '../services/materialService';
import { CardList, Avatar, EmptyState } from '../../../core';

interface MaterialListProps {
    materiels: TypeMateriel[];
    loading: boolean;
    selectedMateriel: TypeMateriel | null;
    onSelect: (materiel: TypeMateriel) => void;
    onOpenAdd: () => void;
    onOpenEdit: (materiel: TypeMateriel) => void;
    onDelete: (materiel: TypeMateriel) => void;
}

/**
 * Composant de type Liste pour afficher le matériel.
 */
const MaterialList: React.FC<MaterialListProps> = ({
    materiels,
    loading,
    selectedMateriel,
    onSelect,
    onOpenAdd,
    onOpenEdit,
    onDelete
}) => {
    return (
        <CardList
            actionLabel="Nouveau Matériel"
            onAction={onOpenAdd}
            actionIcon={Plus}
        >
            {/* 1. Affichage pendant le chargement */}
            {loading ? (
                <div className="flex justify-center p-8">
                    <Avatar loading size="md" initials="" />
                </div>
            ) : /* 2. Affichage si la liste est vide */
            materiels.length === 0 ? (
                <EmptyState
                    icon={Package}
                    title="Aucun matériel"
                    description="Aucun matériel trouvé."
                    size="sm"
                />
            ) : (
                /* 3. Affichage de la liste réelle */
                <div className="space-y-1">
                    {materiels.map((materiel) => (
                        <MaterialItem
                            key={materiel.id}
                            materiel={materiel}
                            isSelected={selectedMateriel?.id === materiel.id}
                            onSelect={onSelect}
                            onEdit={onOpenEdit}
                            onDelete={onDelete}
                        />
                    ))}
                </div>
            )}
        </CardList>
    );
};

export default MaterialList;

/**
 * LOGIGRAMME D'AFFICHAGE :
 * 
 * 1. DÉMARRAGE -> Le composant regarde si `loading` est vrai.
 * 2. CHARGEMENT -> SI OUI : Affiche le cercle qui tourne.
 * 3. ANALYSE -> SI NON : Regarde si la liste `materiels` contient des éléments.
 * 4. VIDE -> SI VIDE : Affiche le message "Aucun matériel".
 * 5. LISTE -> SI PLEINE : Génère une ligne `MaterialItem` pour chaque objet trouvé.
 */
