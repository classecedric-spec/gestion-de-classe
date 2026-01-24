import React from 'react';
import { GitBranch, Search, Plus } from 'lucide-react';
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
import { Badge, Button, Avatar, EmptyState } from '../../../components/ui';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];

interface BranchListProps {
    branches: BrancheRow[];
    loading: boolean;
    searchTerm: string;
    onSearchChange: (value: string) => void;
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
    searchTerm,
    onSearchChange,
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
        <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">
            {/* Header */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <GitBranch className="text-primary" size={24} />
                        Branches
                    </h2>
                    <Badge variant="primary" size="sm">
                        {branches.length} Total
                    </Badge>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher une branche..."
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
                    Nouvelle Branche
                </Button>
            </div>
        </div>
    );
};

export default React.memo(BranchList);
