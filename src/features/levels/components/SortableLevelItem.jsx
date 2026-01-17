import React from 'react';
import { GripVertical, Edit, X, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableLevelItem = ({ level, index, isSelected, onClick, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: level.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative',
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => onClick(level)}
            className={clsx(
                "group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer hover:z-50",
                isSelected
                    ? "selected-state"
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface",
                isDragging ? "opacity-50 border-primary dashed" : ""
            )}
        >
            {/* Drag Handle */}
            <div
                {...attributes}
                {...listeners}
                className={clsx(
                    "cursor-grab active:cursor-grabbing p-1.5 rounded-lg transition-colors outline-none",
                    isSelected
                        ? "text-text-dark/50 hover:text-text-dark hover:bg-text-dark/10"
                        : "text-grey-medium hover:text-white hover:bg-white/5"
                )}
                onClick={(e) => e.stopPropagation()}
            >
                <GripVertical size={16} />
            </div>

            {/* Index Badge */}
            <div className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 transition-colors shadow-inner",
                isSelected
                    ? "bg-white/20 text-text-dark"
                    : "bg-background text-primary group-hover:bg-white/10 group-hover:text-white"
            )}>
                {index + 1}
            </div>

            <div className="flex-1 min-w-0">
                <h3 className={clsx(
                    "font-bold text-sm truncate transition-colors",
                    isSelected ? "text-text-dark" : "text-text-main"
                )}>
                    {level.nom}
                </h3>
            </div>

            <div className={clsx(
                "flex gap-1 transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(level); }}
                    className={clsx(
                        "p-1.5 rounded-lg transition-colors",
                        isSelected
                            ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                            : "text-grey-medium hover:text-white hover:bg-white/10"
                    )}
                    title="Modifier"
                >
                    <Edit size={14} />
                </button>
            </div>

            <ChevronRight size={16} className={clsx(
                "transition-transform ml-2",
                isSelected ? "text-text-dark translate-x-0" : "text-grey-dark group-hover:text-white"
            )} />

            {/* Absolute Delete Button */}
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(level); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer le niveau"
            >
                <X size={14} strokeWidth={3} />
            </button>
        </div>
    );
};

export default React.memo(SortableLevelItem);
