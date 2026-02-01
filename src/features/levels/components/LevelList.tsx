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
    // Drag and Drop sensors
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
            {/* Header */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Layers className="text-primary" size={24} />
                        Niveaux
                    </h2>
                    <Badge variant="primary" size="sm">
                        {levels.length} Total
                    </Badge>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un niveau..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Avatar loading size="md" initials="" />
                    </div>
                ) : levels.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="Aucun niveau"
                        description="Aucun niveau trouvé."
                        size="sm"
                    />
                ) : (
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

            {/* Add Button */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <Button
                    onClick={onOpenAdd}
                    variant="secondary"
                    className="w-full border-dashed"
                    icon={Plus}
                >
                    Nouveau Niveau
                </Button>
            </div>
        </div>
    );
};

export default LevelList;
