import React, { useState } from 'react';
import { GitBranch, ListTree, Info } from 'lucide-react';
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
import { Avatar, EmptyState, Badge, CardInfo, CardTabs } from '../../../components/ui';

type BrancheRow = Database['public']['Tables']['Branche']['Row'];
type SousBrancheRow = Database['public']['Tables']['SousBranche']['Row'];

interface BranchDetailsProps {
    selectedBranch: BrancheRow | null;
    subBranches: SousBrancheRow[];
    onReorderSub: (subBranches: SousBrancheRow[]) => void;
    rightContentRef: React.RefObject<HTMLDivElement>;
    headerHeight?: number;
}

const BranchDetails: React.FC<BranchDetailsProps> = ({
    selectedBranch,
    subBranches,
    onReorderSub,
    rightContentRef,
    headerHeight
}) => {
    const [activeTab, setActiveTab] = useState('subbranches');

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
            <div className="flex-1 card-flat overflow-hidden">
                <EmptyState
                    icon={GitBranch}
                    title="Sélectionnez une branche"
                    description="Choisissez une branche dans la liste pour voir ses détails et les sous-branches associées."
                    size="md"
                />
            </div>
        );
    }

    const photo = selectedBranch.photo_url || (selectedBranch as any).photo_base64;

    return (
        <>
            <CardInfo
                ref={rightContentRef}
                height={headerHeight}
            >
                <div className="flex gap-5 items-center">
                    <Avatar
                        size="lg"
                        src={photo}
                        icon={GitBranch}
                        className="bg-surface border-4 border-background"
                    />
                    <div className="flex-1 min-w-0">
                        <h2 className="text-cq-xl font-bold text-text-main truncate">
                            {selectedBranch.nom}
                        </h2>
                        <div className="flex items-center gap-3 mt-1">
                            <Badge variant="primary" size="xs">Branche Pédagogique</Badge>
                            <Badge variant="secondary" size="xs" className="bg-white/5">
                                {subBranches.length} Sous-branches
                            </Badge>
                        </div>
                    </div>
                </div>
            </CardInfo>

            <CardTabs
                tabs={[
                    { id: 'subbranches', label: 'Sous-branches', icon: ListTree },
                    { id: 'infos', label: 'Informations', icon: Info }
                ]}
                activeTab={activeTab}
                onChange={setActiveTab}
            >
                {activeTab === 'subbranches' && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                )}

                {activeTab === 'infos' && (
                    <div className="p-8 text-center text-grey-medium italic opacity-60 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        Aucune information supplémentaire disponible pour cette branche.
                    </div>
                )}
            </CardTabs>
        </>
    );
};

export default React.memo(BranchDetails);
