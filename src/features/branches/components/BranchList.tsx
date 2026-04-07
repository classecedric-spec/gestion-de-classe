/**
 * Nom du module/fichier : BranchList.tsx
 * 
 * Données en entrée : 
 *   - `branches` : Liste des matières principales enregistrées.
 *   - `selectedBranch` : La matière actuellement visualisée.
 *   - `loading` : État de chargement (vrai pendant que l'ordinateur récupère les données).
 * 
 * Données en sortie : 
 *   - L'ordre réorganisé des branches via `onReorder`.
 *   - La sélection d'une branche via `onSelect`.
 * 
 * Objectif principal : Afficher l'ensemble des branches (matières) sous forme de liste interactive et ordonnable dans la colonne latérale.
 * 
 * Ce que ça affiche : Une liste de "Cartes" (SortableBranchItem) qu'on peut faire glisser pour changer leur ordre, ou cliquer pour ouvrir les détails.
 */

import React from 'react';
import { GitBranch, Plus } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableBranchItem from './SortableBranchItem';
import type { Database } from '../../../types/supabase';
import { CardList, Avatar, EmptyState } from '../../../core';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];

interface BranchListProps {
    branches: BrancheRow[];
    loading: boolean;
    selectedBranch: BrancheRow | null;
    onSelect: (branch: BrancheRow) => void;
    onOpenAdd: () => void;
    onEdit: (branch: BrancheRow) => void;
    onDelete: (branch: BrancheRow) => void;
    onReorder: (branches: BrancheRow[]) => void;
}

const BranchList: React.FC<BranchListProps> = ({
    branches,
    loading,
    selectedBranch,
    onSelect,
    onOpenAdd,
    onEdit,
    onDelete,
    onReorder
}) => {
    /**
     * CONFIGURATION DES CAPTEURS DE MOUVEMENT :
     * On définit comment l'ordinateur doit réagir au glissement.
     * On ajoute une petite contrainte de 8 pixels pour éviter de déclencher un déplacement 
     * par erreur lors d'un simple clic.
     */
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    /**
     * GESTION DE LA FIN DU DÉPLACEMENT (DragEnd) :
     * Lorsque l'enseignant lâche une branche à une nouvelle position, 
     * cette fonction calcule le nouvel ordre et demande au programme de le sauvegarder.
     */
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = branches.findIndex((item) => item.id === active.id);
            const newIndex = branches.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(branches, oldIndex, newIndex);
            onReorder(newItems);
        }
    };

    return (
        <CardList
            actionLabel="Nouvelle Branche"
            onAction={onOpenAdd}
            actionIcon={Plus}
        >
            {/* ÉCRAN DE CHARGEMENT */}
            {loading ? (
                <div className="flex justify-center p-8">
                    <Avatar loading size="md" initials="" />
                </div>
            ) : branches.length === 0 ? (
                /* ÉCRAN VIDE SI AUCUNE MATIÈRE */
                <EmptyState
                    icon={GitBranch}
                    title="Aucune branche"
                    description="Aucune branche trouvée."
                    size="sm"
                />
            ) : (
                /* LISTE INTERACTIVE AVEC DRAG & DROP */
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={branches.map(b => b.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-1">
                            {branches.map((branch) => (
                                <SortableBranchItem
                                    key={branch.id}
                                    branch={branch}
                                    isSelected={selectedBranch?.id === branch.id}
                                    onClick={onSelect}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </CardList>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le module des branches se charge. Pendant ce temps, une icône de chargement tourne.
 * 2. Si aucune branche n'existe, un message "Aucune branche trouvée" s'affiche avec un bouton pour en créer une.
 * 3. Si des branches existent, elles sont dessinées les unes après les autres.
 * 4. L'ordinateur active le "DndContext" : il surveille tous les mouvements de souris sur ces branches.
 * 5. Quand l'enseignant déplace "Maths" au-dessus de "Français" et relâche, `handleDragEnd` calcule le nouvel ordre des lignes.
 * 6. Les modifications sont immédiatement envoyées pour mise à jour permanente.
 */
export default React.memo(BranchList);
