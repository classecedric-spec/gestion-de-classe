import React from 'react';
import { Package, Edit, X } from 'lucide-react';
import clsx from 'clsx';

const ChevronRight = ({ size, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="m9 18 6-6-6-6" />
    </svg>
);

const MaterialItem = ({ materiel, isSelected, onSelect, onEdit, onDelete }) => {
    return (
        <div
            onClick={onSelect}
            className={clsx(
                "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                isSelected
                    ? "selected-state"
                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
            )}
            role="button"
            tabIndex={0}
        >
            <div className={clsx(
                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                isSelected ? "bg-white/20 text-text-dark" : "bg-background text-primary"
            )}>
                <Package size={20} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h3 className={clsx(
                        "font-semibold truncate",
                        isSelected ? "text-text-dark" : "text-text-main"
                    )}>
                        {materiel.nom}
                    </h3>
                    {materiel.acronyme && (
                        <span className={clsx(
                            "text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border",
                            isSelected
                                ? "bg-black/20 text-white/80 border-black/10"
                                : "bg-primary/10 text-primary border-primary/20"
                        )}>
                            {materiel.acronyme}
                        </span>
                    )}
                </div>
            </div>

            {/* Hover Actions */}
            <div className={clsx(
                "flex gap-1 transition-opacity",
                isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            )}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className={clsx(
                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                        isSelected
                            ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                            : "text-grey-medium hover:text-white hover:bg-white/10"
                    )}
                    title="Modifier"
                >
                    <Edit size={14} />
                </button>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                title="Supprimer"
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

export default React.memo(MaterialItem);
