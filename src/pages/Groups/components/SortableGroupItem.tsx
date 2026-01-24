import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Layers, Edit, X, ChevronRight, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { Tables } from '../../../types/supabase';
import { Avatar } from '../../../components/ui';

interface SortableGroupItemProps {
    group: Tables<'Groupe'>;
    selectedGroup: Tables<'Groupe'> | null;
    onClick: (group: Tables<'Groupe'>) => void;
    onEdit: (group: Tables<'Groupe'>) => void;
    onDelete: (group: Tables<'Groupe'>) => void;
}

export function SortableGroupItem({ group, selectedGroup, onClick, onEdit, onDelete }: SortableGroupItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: group.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        position: 'relative' as const,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onClick(group)}
            className={clsx(
                "w-full flex items-center gap-4 p-4 rounded-xl transition-all border text-left group relative cursor-pointer",
                isDragging ? "opacity-50 bg-background/50 border-primary/50 shadow-lg" : "",
                selectedGroup?.id === group.id
                    ? "selected-state"
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className="p-2 -ml-2 text-grey-dark hover:text-white cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-colors"
                onClick={(e) => e.stopPropagation()}
                title="Déplacer"
            >
                <GripVertical size={16} />
            </div>

            <Avatar
                size="md"
                src={group.photo_url}
                icon={Layers}
                initials={group.acronyme || (group.nom && group.nom[0])}
                className={clsx(
                    selectedGroup?.id === group.id ? "bg-white/20" : "bg-background",
                    group.photo_url && "bg-[#D9B981]"
                )}
            />

            <div className="flex-1 min-w-0">
                <p className={clsx(
                    "font-semibold truncate",
                    selectedGroup?.id === group.id ? "text-text-dark" : "text-text-main"
                )}>
                    {group.nom}
                </p>
            </div>

            <div className={clsx(
                "flex gap-1 transition-opacity",
                selectedGroup?.id === group.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <div
                    onClick={(e) => { e.stopPropagation(); onEdit(group); }}
                    className={clsx(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        selectedGroup?.id === group.id
                            ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                            : "text-grey-medium hover:text-white hover:bg-white/10"
                    )}
                    title="Modifier"
                >
                    <Edit size={14} />
                </div>
            </div>

            {/* Absolute Delete Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(group); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer le groupe"
            >
                <X size={14} strokeWidth={3} />
            </button>

            <ChevronRight size={16} className={clsx(
                "transition-transform",
                selectedGroup?.id === group.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
            )} />
        </div>
    );
}
