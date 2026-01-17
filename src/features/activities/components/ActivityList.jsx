import React from 'react';
import { Search, Plus, Edit, X, Folder, ChevronRight, Loader2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Puzzle, FileText } from 'lucide-react';

const ActivityList = ({
    activities, // filtered list
    totalCount,
    loading,
    searchTerm,
    onSearchChange,
    selectedActivity,
    onSelect,
    onEdit,
    onDeleteRequest,
    onOpenCreate,
    statusFilter,
    onStatusFilterChange,
    moduleFilter,
    onModuleFilterChange,
    availableModules
}) => {
    return (
        <div className="w-1/3 flex flex-col bg-surface/30 backdrop-blur-md rounded-2xl border border-white/5 overflow-hidden shadow-xl min-w-[300px]">
            {/* Header */}
            <div className="p-6 border-b border-white/5 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                        <FileText className="text-primary" size={24} />
                        Liste des Activités
                    </h2>
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-md uppercase tracking-wider">
                        {totalCount} Total
                    </span>
                </div>

                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-grey-medium group-focus-within:text-primary transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Rechercher une activité..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full bg-background/50 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-text-main focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                </div>

                {/* Hierarchical Filters */}
                <div className="grid grid-cols-2 gap-2">
                    {/* Status Filter */}
                    <div className="relative group">
                        <select
                            value={statusFilter}
                            onChange={(e) => onStatusFilterChange(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all uppercase tracking-wider"
                        >
                            <option value="all">Statuts: Tous</option>
                            <option value="en_preparation">Prép.</option>
                            <option value="en_cours">En Cours</option>
                            <option value="archive">Archivés</option>
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Module Filter */}
                    <div className="relative group">
                        <select
                            value={moduleFilter}
                            onChange={(e) => onModuleFilterChange(e.target.value)}
                            className="w-full bg-background/50 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-bold text-text-main focus:ring-2 focus:ring-primary/50 outline-none appearance-none cursor-pointer transition-all uppercase tracking-wider truncate pr-8"
                        >
                            <option value="all">Modules: Tous</option>
                            {availableModules.map(m => (
                                <option key={m.id} value={m.id}>{m.nom}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-grey-medium group-focus-within:text-primary transition-colors">
                            <ChevronDown size={14} />
                        </div>
                    </div>
                </div>
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : activities.length === 0 ? (
                    <div className="text-center p-8 text-grey-medium italic">Aucune activité trouvée.</div>
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity.id}
                            onClick={() => onSelect(activity)}
                            className={clsx(
                                "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50 cursor-pointer",
                                selectedActivity?.id === activity.id
                                    ? "selected-state"
                                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                            )}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(activity); }}
                        >
                            <div className={clsx(
                                "w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shadow-inner overflow-hidden shrink-0",
                                selectedActivity?.id === activity.id ? "bg-white/20 text-text-dark" : "bg-background text-primary"
                            )}>
                                <Puzzle size={20} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className={clsx(
                                    "font-semibold truncate",
                                    selectedActivity?.id === activity.id ? "text-text-dark" : "text-text-main"
                                )}>
                                    {activity.titre}
                                </h3>

                                {activity.Module && (
                                    <p className={clsx(
                                        "text-xs truncate flex items-center gap-1 mt-0.5",
                                        selectedActivity?.id === activity.id ? "text-text-dark/70" : "text-grey-medium"
                                    )}>
                                        <Folder size={10} />
                                        {activity.Module.nom}
                                    </p>
                                )}
                            </div>

                            <div className={clsx(
                                "flex gap-1 transition-opacity",
                                selectedActivity?.id === activity.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                                <div
                                    onClick={(e) => { e.stopPropagation(); onEdit(activity); }}
                                    className={clsx(
                                        "p-1.5 rounded-lg transition-colors cursor-pointer",
                                        selectedActivity?.id === activity.id
                                            ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                            : "text-grey-medium hover:text-white hover:bg-white/10"
                                    )}
                                    title="Modifier"
                                >
                                    <Edit size={14} />
                                </div>
                            </div>

                            {/* Absolute Delete Button - Only visible on hover */}
                            <button
                                onClick={(e) => { e.stopPropagation(); onDeleteRequest(activity); }}
                                className="absolute -top-2 -right-2 z-10 p-2 bg-danger/10 hover:bg-danger text-danger hover:text-white rounded-full border border-danger/20 opacity-0 group-hover:opacity-100 transition-all shadow-lg scale-90 hover:scale-100"
                                title="Supprimer l'activité"
                            >
                                <X size={14} strokeWidth={3} />
                            </button>

                            <ChevronRight size={16} className={clsx(
                                "transition-transform",
                                selectedActivity?.id === activity.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                            )} />
                        </div>
                    ))
                )}
            </div>

            {/* Add Button */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <button
                    onClick={onOpenCreate}
                    className="w-full py-3 bg-white/5 hover:bg-primary/20 hover:text-primary text-grey-light rounded-xl border border-dashed border-white/20 hover:border-primary/50 transition-all flex items-center justify-center gap-2 group"
                >
                    <Plus size={18} className="group-hover:scale-110 transition-transform" />
                    <span className="font-medium">Nouvelle Activité</span>
                </button>
            </div>
        </div>
    );
};

export default ActivityList;
