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
            {loading ? (
                <div className="flex justify-center p-8">
                    <Avatar loading size="md" initials="" />
                </div>
            ) : branches.length === 0 ? (
                <EmptyState
                    icon={GitBranch}
                    title="Aucune branche"
                    description="Aucune branche trouvée."
                    size="sm"
                />
            ) : (
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

export default React.memo(BranchList);
