import React from 'react';
import { GitBranch } from 'lucide-react';
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
import SortableSubBranchItem from './SortableSubBranchItem';
import type { Database } from '../../../types/supabase';
import { Avatar, EmptyState, Badge } from '../../../components/ui';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];

interface BranchDetailsProps {
    selectedBranch: BrancheRow | null;
    subBranches: SousBrancheRow[];
    onReorderSub: (subBranches: SousBrancheRow[]) => void;
}

const BranchDetails: React.FC<BranchDetailsProps> = ({ selectedBranch, subBranches, onReorderSub }) => {
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = subBranches.findIndex((item) => item.id === active.id);
            const newIndex = subBranches.findIndex((item) => item.id === over.id);
            const newItems = arrayMove(subBranches, oldIndex, newIndex);
            onReorderSub(newItems);
        }
    };

    if (!selectedBranch) {
        return (
            <EmptyState
                icon={GitBranch}
                title="Sélectionnez une branche"
                description="Choisissez une branche dans la liste pour voir ses détails et les sous-branches associées."
                size="lg"
                className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl"
            />
        );
    }

    const photo = selectedBranch.photo_url || (selectedBranch as any).photo_base64;

    return (
        <div className="flex-1 bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 shadow-xl flex flex-col overflow-hidden relative">
            {/* Header */}
            <div className="p-8 border-b border-white/5 flex items-start justify-between bg-surface/20">
                <div className="flex gap-6 items-center">
                    <Avatar
                        size="xl"
                        src={photo}
                        icon={GitBranch}
                        className="bg-surface border-4 border-background"
                    />
                    <div>
                        <h1 className="text-4xl font-bold text-text-main mb-2">{selectedBranch.nom}</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-background/20">
                <h3 className="text-lg font-bold text-text-main mb-6 flex items-center gap-3 border-b border-white/5 pb-2 uppercase tracking-wide">
                    <GitBranch className="text-primary" size={24} />
                    Sous-branches liées
                    <Badge variant="secondary" size="sm" className="ml-auto bg-white/10 text-grey-light">
                        {subBranches.length}
                    </Badge>
                </h3>

                {subBranches.length === 0 ? (
                    <EmptyState
                        icon={GitBranch}
                        title="Aucune sous-branche"
                        description="Aucune sous-branche liée à cette branche."
                        size="md"
                        className="border-2 border-dashed border-white/5 rounded-xl"
                    />
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
