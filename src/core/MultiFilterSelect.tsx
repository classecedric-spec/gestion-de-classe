import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import clsx from 'clsx';

export interface MultiFilterOption {
    value: string;
    label: string;
}

export interface MultiFilterSelectProps {
    label: string;
    options: (string | MultiFilterOption)[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
    icon?: React.ReactNode;
    className?: string;
    portal?: boolean;
}

export const MultiFilterSelect: React.FC<MultiFilterSelectProps> = ({
    label,
    options,
    selectedValues,
    onChange,
    placeholder = "Sélectionner...",
    icon,
    className,
    portal = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

    // Update position when opening
    useEffect(() => {
        if (isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                // If using portal, also check portal content
                const portalContent = document.getElementById('multi-filter-portal-content');
                if (portalContent && portalContent.contains(event.target as Node)) {
                    return;
                }
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const normalizedOptions = useMemo(() => {
        return options.map(opt => {
            if (typeof opt === 'string') return { value: opt, label: opt };
            return opt;
        });
    }, [options]);

    const filteredOptions = useMemo(() => {
        if (!searchQuery) return normalizedOptions;
        return normalizedOptions.filter(opt => 
            opt.label.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [normalizedOptions, searchQuery]);

    const toggleOption = (value: string) => {
        if (selectedValues.includes(value)) {
            onChange(selectedValues.filter(v => v !== value));
        } else {
            onChange([...selectedValues, value]);
        }
    };

    const handleSelectAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(normalizedOptions.map(opt => opt.value));
    };

    const handleClearAll = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange([]);
    };

    const selectionSummary = useMemo(() => {
        if (selectedValues.length === 0 || selectedValues.length === normalizedOptions.length) return 'Toutes';
        if (selectedValues.length === 1) {
            const opt = normalizedOptions.find(o => o.value === selectedValues[0]);
            return opt ? opt.label : '1 sélectionné';
        }
        return `${selectedValues.length} sélectionné${selectedValues.length > 1 ? 's' : ''}`;
    }, [selectedValues, normalizedOptions]);

    const dropdownContent = (
        <div 
            id="multi-filter-portal-content"
            className="w-64 bg-surface-dark border border-white/10 rounded-2xl shadow-2xl z-[9999] animate-in fade-in zoom-in-95 duration-200 backdrop-blur-xl"
            style={portal ? {
                position: 'fixed',
                top: coords.top - window.scrollY + 8,
                left: coords.left - window.scrollX,
            } : {}}
            onMouseDown={(e) => e.stopPropagation()}
        >
            {/* Header with Search */}
            <div className="p-3 border-b border-white/5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-grey-medium">
                        Filtrer par {label.toLowerCase()}
                    </span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleSelectAll}
                            className="text-[9px] font-black uppercase text-primary hover:text-primary-light transition-colors"
                        >
                            Tous
                        </button>
                        <span className="text-[9px] text-white/10">|</span>
                        <button 
                            onClick={handleClearAll}
                            className="text-[9px] font-black uppercase text-rose-500 hover:text-rose-400 transition-colors"
                        >
                            Aucun
                        </button>
                    </div>
                </div>
                
                <div className="relative">
                    <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-grey-dark" />
                    <input
                        type="text"
                        autoFocus
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher..."
                        className="w-full bg-background/50 border border-white/5 rounded-lg py-1.5 pl-8 pr-3 text-xs text-text-main focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-grey-dark hover:text-text-main"
                        >
                            <X size={12} />
                        </button>
                    )}
                </div>
            </div>

            {/* Options List */}
            <div className="max-h-60 overflow-y-auto p-1 py-1 custom-scrollbar">
                {filteredOptions.length === 0 ? (
                    <div className="p-4 text-center text-grey-medium text-xs font-medium">
                        Aucun résultat
                    </div>
                ) : (
                    filteredOptions.map((option) => {
                        const isSelected = selectedValues.includes(option.value);
                        return (
                            <button
                                key={option.value}
                                onClick={() => toggleOption(option.value)}
                                className={clsx(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left group",
                                    isSelected ? "bg-primary/5 text-primary" : "text-text-main hover:bg-white/5"
                                )}
                            >
                                <div className={clsx(
                                    "w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0",
                                    isSelected ? "bg-primary border-primary" : "border-white/10 bg-black/20 group-hover:border-white/20"
                                )}>
                                    {isSelected && <Check size={10} className="text-text-dark" strokeWidth={4} />}
                                </div>
                                <span className={clsx("text-sm transition-all truncate", isSelected ? "font-bold tracking-tight" : "font-medium")}>
                                    {option.label}
                                </span>
                            </button>
                        );
                    })
                )}
            </div>
        </div>
    );

    return (
        <div className={clsx("relative inline-block", className)} ref={containerRef}>
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    "flex items-center transition-all text-left overflow-hidden group select-none",
                    className?.includes('bg-transparent') 
                        ? "bg-transparent h-auto p-0" 
                        : "bg-black/40 border border-white/5 rounded-full hover:bg-white/10 h-10",
                    isOpen && !className?.includes('bg-transparent') && "ring-2 ring-primary/30 border-primary/30 bg-white/10",
                    isOpen && className?.includes('bg-transparent') && "text-primary"
                )}
            >
                {/* Left Label Section (Static) - Only show if NOT transparent/minimalist */}
                {!className?.includes('bg-transparent') && (
                    <div className="h-full px-4 flex items-center transition-colors group-hover:bg-white/5">
                        {icon && (
                            <div className="shrink-0 mr-2 flex items-center justify-center opacity-70">
                                {icon}
                            </div>
                        )}
                        <span className="text-[10px] uppercase font-black tracking-widest text-grey-medium leading-none whitespace-nowrap">
                            {label}
                        </span>
                    </div>
                )}

                {/* Right Selection Section */}
                <div className={clsx(
                    "flex items-center gap-3 min-w-0",
                    className?.includes('bg-transparent') ? "px-0" : "px-4 flex-1"
                )}>
                    {className?.includes('bg-transparent') && icon && (
                        <div className="shrink-0">
                            {icon}
                        </div>
                    )}
                    <span className={clsx(
                        "text-sm truncate",
                        className?.includes('bg-transparent') ? "font-bold text-grey-light group-hover:text-white" : "font-bold text-text-main"
                    )}>
                        {className?.includes('bg-transparent') ? label : selectionSummary}
                    </span>
                    <ChevronDown size={14} className={clsx("text-grey-dark transition-transform duration-300 shrink-0", isOpen && "rotate-180")} />
                </div>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (portal ? createPortal(dropdownContent, document.body) : dropdownContent)}
        </div>
    );
};
