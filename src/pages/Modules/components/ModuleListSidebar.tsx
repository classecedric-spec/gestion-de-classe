import React, { useEffect, useRef } from 'react';
import { Folder, Search, Plus, Edit, X, ChevronDown, Loader2 } from 'lucide-react';
import clsx from 'clsx';
import { Tables } from '../../../../types/supabase';

// Helper component for chevron icon
const ChevronRight = ({ size, className }: { size: number | string; className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="m9 18 6-6-6-6" />
    </svg>
);

interface ModuleListSidebarProps {
    filteredModules: any[];
    selectedModule: Tables<'Module'> | null;
    searchTerm: string;
    setSearchTerm: (s: string) => void;
    statusFilter: string;
    setStatusFilter: (s: string) => void;
    branchFilter: string;
    setBranchFilter: (s: string) => void;
    subBranchFilter: string;
    setSubBranchFilter: (s: string) => void;
    availableBranches: any[];
    availableSubBranches: any[];
    onModuleSelect: (m: any) => void;
    onEdit: (m: any) => void;
    onDelete: (m: any) => void;
    onAddModule: () => void;
    loading?: boolean;
}

/**
 * ModuleListSidebar
 * Left sidebar with search, filters, and module list
 */
const ModuleListSidebar: React.FC<ModuleListSidebarProps> = ({
    filteredModules,
    selectedModule,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    branchFilter,
    setBranchFilter,
    subBranchFilter,
    setSubBranchFilter,
    availableBranches,
    availableSubBranches,
    onModuleSelect,
    onEdit,
    onDelete,
    onAddModule,
    loading = false
}) => {
    const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

    // Auto-scroll to selected module
    useEffect(() => {
        if (selectedModule && itemRefs.current[selectedModule.id]) {
            itemRefs.current[selectedModule.id]?.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [selectedModule, filteredModules]);

    return (
        <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">
            {/* Header & Search */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <Folder className="text-primary" size={24} />
                        Liste des Modules
                    </h2>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {filteredModules.length} {filteredModules.length > 1 ? 'Modules' : 'Module'}
                    </span>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher un module..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                </div>

                {/* Status Filters */}
                <div className="neu-selector-container p-1 rounded-xl">
                    {[
                        { id: 'all', label: 'Tous' },
                        { id: 'en_preparation', label: 'Prép.' },
                        { id: 'en_cours', label: 'En cours' },
                        { id: 'archive', label: 'Arch.' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setStatusFilter(f.id)}
                            data-active={statusFilter === f.id}
                            className={clsx(
                                "flex items-center justify-center rounded-lg font-black uppercase tracking-wider transition-all duration-300",
                                statusFilter !== f.id && "text-grey-medium hover:text-white"
                            )}
                        >
                            <span className="tab-label">{f.label}</span>
                        </button>
                    ))}
                </div>

                {/* Hierarchical Filters */}
                <div className={clsx("grid gap-2", branchFilter !== 'all' ? "grid-cols-2" : "grid-cols-1")}>
                    {/* Branch Filter */}
                    <div className="relative group">
                        <select
                            value={branchFilter}
                            onChange={(e) => setBranchFilter(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all uppercase tracking-wider truncate pr-7"
                        >
                            <option value="all">Branches: Tous</option>
                            {availableBranches.map(b => (
                                <option key={b.id} value={b.id}>{b.nom}</option>
                            ))}
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Sub-Branch Filter */}
                    {branchFilter !== 'all' && (
                        <div className="relative group animate-in slide-in-from-left-2 duration-200">
                            <select
                                value={subBranchFilter}
                                onChange={(e) => setSubBranchFilter(e.target.value)}
                                className="w-full bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all uppercase tracking-wider truncate pr-7"
                            >
                                <option value="all">Sous-Br.: Tous</option>
                                {availableSubBranches.map(sb => (
                                    <option key={sb.id} value={sb.id}>{sb.nom}</option>
                                ))}
                            </select>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar relative">
                {loading && filteredModules.length === 0 && (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                )}

                {!loading && filteredModules.length === 0 && (
                    <div className="text-center p-8 text-grey-medium italic">Aucun module trouvé.</div>
                )}

                {filteredModules.length > 0 && (
                    <div className={clsx("space-y-2", loading && "opacity-50 pointer-events-none")}>
                        {filteredModules.map((module) => {
                            const isExpired = module.date_fin && new Date(module.date_fin) < new Date();
                            return (
                                <div
                                    key={module.id}
                                    ref={el => { itemRefs.current[module.id] = el }}
                                    onClick={() => onModuleSelect(module)}
                                    className={clsx(
                                        "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer overflow-hidden backdrop-blur-sm",
                                        selectedModule?.id === module.id
                                            ? clsx("selected-state", isExpired && "!border-danger")
                                            : (isExpired ? "bg-surface/50 border-danger/40 hover:border-danger/60" : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface")
                                    )}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onModuleSelect(module); }}
                                >
                                    <div className={clsx(
                                        "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                                        selectedModule?.id === module.id
                                            ? "bg-white/20 text-inherit"
                                            : "bg-background text-primary"
                                    )}>
                                        <Folder size={20} />
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col gap-1">
                                        {/* Line 1: Module Name + Date */}
                                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                                            <h3 className={clsx(
                                                "font-bold truncate text-[13px] leading-tight flex-1",
                                                selectedModule?.id === module.id ? "text-text-dark" : "text-text-main"
                                            )}>
                                                {module.nom}
                                            </h3>
                                            {module.date_fin && (
                                                <span className={clsx(
                                                    "font-bold text-[10px] shrink-0",
                                                    isExpired
                                                        ? (selectedModule?.id === module.id ? "text-white" : "text-danger")
                                                        : (selectedModule?.id === module.id ? "text-text-dark/70" : "text-white/60")
                                                )}>
                                                    {new Date(module.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                </span>
                                            )}
                                        </div>

                                        {/* Line 2: Progress Bar + Branch Info */}
                                        <div className="flex flex-col gap-1.5">
                                            <div className="w-full h-1.5 rounded-full bg-black/20 overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full transition-all duration-500 ease-out",
                                                        isExpired ? (selectedModule?.id === module.id ? "bg-white" : "bg-danger") : "bg-success"
                                                    )}
                                                    style={{ width: `${module.percent || 0}%` }}
                                                />
                                            </div>
                                            <div className={clsx(
                                                "flex items-center gap-2 text-[10px] truncate",
                                                selectedModule?.id === module.id ? "text-text-dark/70" : "text-grey-medium"
                                            )}>
                                                <span className="truncate opacity-80" title={`${module.SousBranche?.Branche?.nom} > ${module.SousBranche?.nom}`}>
                                                    {module.SousBranche?.Branche?.nom} - {module.SousBranche?.nom}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={clsx(
                                        "flex gap-1 transition-opacity",
                                        selectedModule?.id === module.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                                    )}>
                                        <div
                                            onClick={(e) => { e.stopPropagation(); onEdit(module); }}
                                            className={clsx(
                                                "p-1.5 rounded-lg transition-colors cursor-pointer",
                                                selectedModule?.id === module.id
                                                    ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                                    : "text-grey-medium hover:text-white hover:bg-white/10"
                                            )}
                                            title="Modifier"
                                        >
                                            <Edit size={14} />
                                        </div>
                                    </div>

                                    {/* Delete Button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDelete(module); }}
                                        className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                        title="Supprimer le module"
                                    >
                                        <X size={14} strokeWidth={3} />
                                    </button>

                                    <ChevronRight size={16} className={clsx(
                                        "transition-transform",
                                        selectedModule?.id === module.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                                    )} />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Module Button */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <button
                    onClick={onAddModule}
                    className="w-full h-12 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Ajouter un module</span>
                </button>
            </div>
        </div>
    );
};

export default ModuleListSidebar;
