import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { Tables } from '../../../types/supabase';
import { ListItem } from '../../../components/ui';

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
        <div ref={setNodeRef} style={style}>
            <ListItem
                id={group.id}
                title={group.nom}
                subtitle={group.acronyme || 'Pas d\'acronyme'}
                isSelected={selectedGroup?.id === group.id}
                onClick={() => onClick(group)}
                onEdit={() => onEdit(group)}
                onDelete={() => onDelete(group)}
                deleteTitle="Supprimer le groupe"
                className={clsx(isDragging && "opacity-50 bg-background/50 border-primary/50 shadow-lg")}
                avatar={{
                    src: group.photo_url,
                    initials: group.acronyme || (group.nom && group.nom[0]),
                    className: group.photo_url ? "bg-[#D9B981]" : "bg-background"
                }}
                left={
                    <div
                        {...attributes}
                        {...listeners}
                        className="p-2 -ml-2 text-grey-dark hover:text-white cursor-grab active:cursor-grabbing touch-none flex items-center justify-center transition-colors"
                        title="Déplacer"
                    >
                        <GripVertical size={16} />
                    </div>
                }
            />
        </div>
    );
}
