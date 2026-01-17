import React from 'react';
import { GitBranch } from 'lucide-react';
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
import SortableSubBranchItem from './SortableSubBranchItem';

const BranchDetails = ({ selectedBranch, subBranches, onReorderSub }) => {
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
            const oldIndex = subBranches.findIndex((item) => item.id === active.id);
            const newIndex = subBranches.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(subBranches, oldIndex, newIndex);
            onReorderSub(newItems);
        }
    };

    if (!selectedBranch) {
        return (
            <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col items-center justify-center text-grey-medium">
                <GitBranch size={64} className="mb-4 opacity-50" />
                <p className="text-xl">Sélectionnez une branche pour voir les détails</p>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                <div className="flex gap-6 items-center">
                    <div className="w-24 h-24 rounded-2xl bg-surface border-4 border-background flex items-center justify-center text-primary shadow-2xl shrink-0 overflow-hidden relative group">
                        {(selectedBranch.photo_url || selectedBranch.photo_base64) ? (
                            <img src={selectedBranch.photo_url || selectedBranch.photo_base64} alt={selectedBranch.nom} className="w-full h-full object-cover" />
                        ) : (
                            <GitBranch size={48} />
                        )}
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-text-main mb-2">{selectedBranch.nom}</h1>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Add SubBranch button could go here */}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                    <GitBranch className="text-primary" size={24} />
                    Sous-branches liées
                    <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-grey-light ml-auto">
                        {subBranches.length}
                    </span>
                </h3>

                {subBranches.length === 0 ? (
                    <div className="text-center p-12 border-2 border-dashed border-white/5 rounded-xl">
                        <p className="text-grey-medium italic">Aucune sous-branche liée.</p>
                    </div>
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={subBranches.map(s => s.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-2">
                                {subBranches.map((sub) => (
                                    <SortableSubBranchItem key={sub.id} sub={sub} />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </div>
        </div>
    );
};

export default React.memo(BranchDetails);
