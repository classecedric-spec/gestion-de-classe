import React from 'react';
import { GitBranch, GripVertical } from 'lucide-react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableSubBranchItem = ({ sub }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: sub.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={clsx(
                "flex items-center gap-3 p-4 bg-surface/50 rounded-xl border transition-colors",
                isDragging ? "opacity-50 border-primary dashed" : "border-white/5 hover:border-white/10"
            )}
        >
            <div
                {...attributes}
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-1.5 rounded-lg text-grey-medium hover:text-white hover:bg-white/5 outline-none"
            >
                <GripVertical size={16} />
            </div>

            <div className="w-10 h-10 rounded-lg bg-background flex items-center justify-center text-primary shrink-0 overflow-hidden shadow-inner">
                {sub.photo_base64 ? (
                    <img src={sub.photo_base64} alt={sub.nom} className="w-full h-full object-cover" />
                ) : (
                    <GitBranch size={18} />
                )}
            </div>
            <span className="font-semibold text-text-main truncate">{sub.nom}</span>
        </div>
    );
};

export default React.memo(SortableSubBranchItem);
