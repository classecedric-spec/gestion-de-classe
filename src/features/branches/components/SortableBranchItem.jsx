import React from 'react';
import { GripVertical, Edit, X, ChevronRight, GitBranch } from 'lucide-react';
import clsx from 'clsx';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const SortableBranchItem = ({ branch, isSelected, onClick, onEdit, onDelete }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: branch.id });

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
            onClick={() => onClick(branch)}
            className={clsx(
                "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer overflow-visible",
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

            <div className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                isSelected ? "bg-white/20 text-text-dark" : "bg-background text-primary"
            )}>
                {(branch.photo_url || branch.photo_base64) ? (
                    <img src={branch.photo_url || branch.photo_base64} alt={branch.nom} className="w-full h-full object-cover" />
                ) : (
                    <GitBranch size={20} />
                )}
            </div>
            <div className="flex-1 min-w-0">
                <h3 className={clsx(
                    "font-semibold truncate",
                    isSelected ? "text-text-dark" : "text-text-main"
                )}>
                    {branch.nom}
                </h3>
            </div>

            <div className={clsx(
                "flex gap-1 transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <div
                    onClick={(e) => { e.stopPropagation(); onEdit(branch); }}
                    className={clsx(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        isSelected
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
                onClick={(e) => { e.stopPropagation(); onDelete(branch); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer la branche"
            >
                <X size={14} strokeWidth={3} />
            </button>

            <ChevronRight size={16} className={clsx(
                "transition-transform",
                isSelected ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
            )} />
        </div>
    );
};

export default React.memo(SortableBranchItem);
