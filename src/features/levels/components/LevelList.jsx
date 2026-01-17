import React from 'react';
import { Layers, Search, Plus, Loader2 } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableLevelItem from './SortableLevelItem';

const LevelList = ({
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
    // Drag and Drop Logic
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

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            const oldIndex = levels.findIndex((item) => item.id === active.id);
            const newIndex = levels.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(levels, oldIndex, newIndex);
            onReorder(newItems);
        }
    };

    return (
        <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">

            {/* Header & Search */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Layers className="text-primary" size={24} />
                        Niveaux
                    </h2>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {levels.length} Total
                    </span>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={16} />
                    <input
                        type="text"
                        placeholder="Rechercher..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-text-main focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    />
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
                ) : levels.length === 0 ? (
                    <div className="text-center py-8 text-grey-dark text-sm italic">
                        Aucun niveau trouvé.
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={levels.map(n => n.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {levels.map((level, index) => (
                                <SortableLevelItem
                                    key={level.id}
                                    level={level}
                                    index={index}
                                    isSelected={selectedLevel?.id === level.id}
                                    onClick={onSelect}
                                    onEdit={onEdit}
                                    onDelete={onDelete}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>
                )}
            </div>

            {/* Add Level Button */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <button
                    onClick={onOpenAdd}
                    className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Ajouter un niveau</span>
                </button>
            </div>
        </div>
    );
};

export default React.memo(LevelList);
