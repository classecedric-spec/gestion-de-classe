/**
 * Nom du module/fichier : LevelList.tsx
 * 
 * Données en entrée : 
 *   - `levels` : Un tableau contenant tous les niveaux scolaires (CP, CE1, etc.).
 *   - `selectedLevel` : Le niveau actuellement sélectionné par l'utilisateur.
 *   - `searchTerm` : Le texte tapé par l'enseignant pour filtrer la liste.
 * 
 * Données en sortie : 
 *   - La sélection d'un niveau via `onSelect`.
 *   - Le nouvel ordre des niveaux après un déplacement via `onReorder`.
 * 
 * Objectif principal : Afficher l'ensemble des niveaux scolaires dans la colonne latérale, permettre leur recherche et leur réorganisation par glisser-déposer.
 * 
 * Ce que ça affiche : Un panneau latéral avec une barre de recherche, une liste de blocs ordonnables (SortableLevelItem) et un bouton "Nouveau Niveau" en bas.
 */

import React from 'react';
import { Layers, Search, Plus } from 'lucide-react';
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
import SortableLevelItem from './SortableLevelItem';
import { Badge, Button, Avatar, EmptyState } from '../../../core';

interface LevelListProps {
    levels: any[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (value: string) => void;
    selectedLevel: any | null;
    onSelect: (level: any) => void;
    onOpenAdd: () => void;
    onEdit: (level: any) => void;
    onDelete: (level: any) => void;
    onReorder: (levels: any[]) => void;
}

const LevelList: React.FC<LevelListProps> = ({
    levels,
    loading,
    searchTerm,
    onSearchChange,
    selectedLevel,
    onSelect,
    onOpenAdd,
    onEdit,
    onDelete,
    onReorder
}) => {
    /**
     * CAPTEURS DE DÉPLACEMENT :
     * Définit comment le survol et le clic de la souris entraînent le mouvement des blocs.
     * On impose une distance de 8 pixels avant d'activer le "Drag" pour ne pas 
     * confondre un clic de sélection avec un début de déplacement.
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
     * GESTION DU LÂCHÉ (Drop) :
     * Quand l'enseignant relâche un niveau, cette fonction calcule sa nouvelle position 
     * relative aux autres et demande au système de mettre à jour la base de données.
     */
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = levels.findIndex((item) => item.id === active.id);
            const newIndex = levels.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(levels, oldIndex, newIndex);
            onReorder(newItems);
        }
    };

    return (
        <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">
            {/* EN-TÊTE : Titre et Décompte total */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Layers className="text-primary" size={24} />
                        Niveaux scolaires
                    </h2>
                    <Badge variant="primary" size="sm">
                        {levels.length} Total
                    </Badge>
                </div>

                {/* BARRE DE RECHERCHE DYNAMIQUE */}
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un niveau (ex: CM1)..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                </div>
            </div>

            {/* LISTE DES NIVEAUX (Fichiers empilés) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {loading ? (
                    /* Affichage en cas de chargement internet */
                    <div className="flex justify-center p-8">
                        <Avatar loading size="md" initials="" />
                    </div>
                ) : levels.length === 0 ? (
                    /* Affichage si la liste est vide */
                    <EmptyState
                        icon={Layers}
                        title="Aucun niveau"
                        description="Aucun niveau trouvé."
                        size="sm"
                    />
                ) : (
                    /* INTÉGRATION DU DRAG & DROP : Permet de réorganiser la liste à la souris */
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={levels.map(l => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {levels.map((level) => (
                                <SortableLevelItem
                                    key={level.id}
                                    level={level}
                                    isSelected={selectedLevel?.id === level.id}
                                    onClick={() => onSelect(level)}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* PIED DE PAGE : Bouton pour ajouter un nouvel élément */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <Button
                    onClick={onOpenAdd}
                    variant="secondary"
                    className="w-full border-dashed"
                    icon={Plus}
                >
                    Ajouter un niveau
                </Button>
            </div>
        </div>
    );
};

/**
 * LOGIGRAMME DE FONCTIONNEMENT :
 * 
 * 1. Le panneau des niveaux scolaires se charge. Il demande l'état de chargement à l'ordinateur.
 * 2. Une barre de recherche permet de filtrer visuellement la liste en tapant quelques lettres.
 * 3. Chaque niveau (CP, CE1, etc.) s'affiche sous forme d'une ligne interactive.
 * 4. L'enseignant décide de déplacer "Maternelle" en haut de la liste :
 *    - Il attrape la ligne à la souris.
 *    - L'ordinateur calcule en direct la trajectoire (`DndContext` et `SortableContext`).
 *    - Au lâcher, l'ordre est recalculé par `handleDragEnd` et sauvegardé.
 * 5. Si l'enseignant clique sur "Ajouter un niveau", une fenêtre surgissante (Modal) est appelée par le programme parent.
 */
export default LevelList;
