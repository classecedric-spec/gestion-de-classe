import React from 'react';
import { Layers, Plus } from 'lucide-react';
import { Badge, CardInfo, SearchBar, CardList, EmptyState, Avatar } from '../../../core';
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
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import SortableLevelItem from '../../../features/levels/components/SortableLevelItem';

interface LevelListPanelProps {
    loading: boolean;
    filteredLevels: any[]; // Using any to match existing loosely typed code, but ideally strictly typed
    searchTerm: string;
    setSearchTerm: (term: string) => void;
    selectedLevel: any;
    setSelectedLevel: (level: any) => void;
    onAddClick: () => void;
    onEditClick: (e: React.MouseEvent, level: any) => void;
    onDeleteClick: (e: React.MouseEvent, level: any) => void;
    onDragEnd: (event: DragEndEvent) => void;
    contentRef?: React.Ref<HTMLDivElement>;
    headerHeight?: number;
}

export const LevelListPanel: React.FC<LevelListPanelProps> = ({
    loading,
    filteredLevels,
    searchTerm,
    setSearchTerm,
    selectedLevel,
    setSelectedLevel,
    onAddClick,
    onEditClick,
    onDeleteClick,
    onDragEnd,
    contentRef,
    headerHeight
}) => {
    // Sensors for DND
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    return (
        <div className="w-1/4 flex flex-col gap-6 h-full">
            <CardInfo ref={contentRef} height={headerHeight} contentClassName="space-y-5">
                <div className="flex items-center justify-between">
                    <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                        <Layers size={24} className="text-primary" />
                        Niveaux
                    </h2>
                    <Badge variant="primary" size="xs">
                        {filteredLevels.length} Total
                    </Badge>
                </div>

                <div className="border-t border-white/10" />

                <div className="space-y-4">
                    <SearchBar
                        placeholder="Rechercher un niveau..."
                        value={searchTerm}
                        onChange={(e: any) => setSearchTerm(e.target.value)}
                        iconColor="text-primary"
                    />
                </div>
            </CardInfo>

            <CardList
                actionLabel="Nouveau Niveau"
                onAction={onAddClick}
                actionIcon={Plus}
            >
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                        <Avatar size="lg" loading initials="" />
                        <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                    </div>
                ) : filteredLevels.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="Aucun niveau"
                        description={searchTerm ? "Aucun niveau ne correspond." : "Commencez par créer un niveau."}
                        size="sm"
                    />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={onDragEnd}
                    >
                        <SortableContext
                            items={filteredLevels.map(l => l.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1 flex-1">
                                {filteredLevels.map((level, index) => (
                                    <SortableLevelItem
                                        key={level.id}
                                        level={level}
                                        index={index}
                                        isSelected={selectedLevel?.id === level.id}
                                        onClick={() => setSelectedLevel(level)}
                                        onEdit={(l: any) => onEditClick({ stopPropagation: () => { } } as any, l)}
                                        onDelete={(l: any) => onDeleteClick({ stopPropagation: () => { } } as any, l)}
                                    />
                                ))}
                            </div>
                        </SortableContext>
                    </DndContext>
                )}
            </CardList>
        </div>
    );
};
