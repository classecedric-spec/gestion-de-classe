import React from 'react';
import { Users, Plus, Layers } from 'lucide-react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { SortableGroupItem } from './SortableGroupItem';
import { Badge, SearchBar, CardInfo, CardList, Avatar, EmptyState } from '../../../core';
import { Tables } from '../../../types/supabase';

interface GroupsListSidebarProps {
    groups: Tables<'Groupe'>[];
    filteredGroups: Tables<'Groupe'>[];
    selectedGroup: Tables<'Groupe'> | null;
    loading: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    headerHeight?: number;
    headerRef: React.RefObject<HTMLDivElement | null>;
    onSelectGroup: (group: Tables<'Groupe'>) => void;
    onAddGroup: () => void;
    onEditGroup: (e: React.MouseEvent, group: Tables<'Groupe'>) => void;
    onDeleteGroup: (e: React.MouseEvent, group: Tables<'Groupe'>) => void;
    onDragEnd: (event: DragEndEvent) => void;
}

export const GroupsListSidebar: React.FC<GroupsListSidebarProps> = ({
    groups,
    filteredGroups,
    selectedGroup,
    loading,
    searchQuery,
    setSearchQuery,
    headerHeight,
    headerRef,
    onSelectGroup,
    onAddGroup,
    onEditGroup,
    onDeleteGroup,
    onDragEnd
}) => {
    // Sensors for DND
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    return (
        <div className="w-1/4 flex flex-col gap-6 h-full">
            <CardInfo
                ref={headerRef}
                height={headerHeight}
                contentClassName="space-y-5"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                        <Users size={24} className="text-primary" />
                        Groupes
                    </h2>
                    <Badge variant="primary" size="xs">
                        {groups.length} Total
                    </Badge>
                </div>

                <div className="border-t border-white/10" />

                <div className="space-y-4">
                    <SearchBar
                        placeholder="Rechercher un groupe..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        iconColor="text-primary"
                    />
                </div>
            </CardInfo>

            <CardList
                actionLabel="Nouveau Groupe"
                onAction={onAddGroup}
                actionIcon={Plus}
            >
                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                        <Avatar size="lg" loading initials="" />
                        <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                    </div>
                ) : filteredGroups.length === 0 ? (
                    <EmptyState
                        icon={Layers}
                        title="Aucun groupe"
                        description={searchQuery ? "Aucun groupe ne correspond à votre recherche." : "Commencez par créer votre premier groupe d'élèves."}
                        size="sm"
                    />
                ) : (
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={onDragEnd}
                    >
                        <SortableContext
                            items={filteredGroups.map(g => g.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            <div className="space-y-1 flex-1">
                                {filteredGroups.map((group, index) => (
                                    <SortableGroupItem
                                        key={group.id}
                                        index={index}
                                        group={group}
                                        selectedGroup={selectedGroup}
                                        onClick={() => onSelectGroup(group)}
                                        onEdit={(g) => onEditGroup({ stopPropagation: () => { } } as any, g)}
                                        onDelete={(g) => onDeleteGroup({ stopPropagation: () => { } } as any, g)}
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
