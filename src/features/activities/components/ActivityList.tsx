import React from 'react';
import { Badge, Button, Avatar, EmptyState } from '../../../components/ui';
import { Search, Plus, Edit2, Trash2, Folder, ChevronRight, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Puzzle, FileText } from 'lucide-react';
import { ActivityWithRelations } from '../services/activityService';

interface AvailableModule {
    id: string;
    nom: string;
}

interface ActivityListProps {
    activities: ActivityWithRelations[];
    totalCount: number;
    loading: boolean;
    searchTerm: string;
    onSearchChange: (val: string) => void;
    selectedActivity: ActivityWithRelations | null;
    onSelect: (activity: ActivityWithRelations) => void;
    onEdit: (activity: ActivityWithRelations) => void;
    onDeleteRequest: (activity: ActivityWithRelations) => void;
    onOpenCreate: () => void;
    statusFilter: string;
    onStatusFilterChange: (val: string) => void;
    moduleFilter: string;
    onModuleFilterChange: (val: string) => void;
    availableModules: AvailableModule[];
}

const ActivityList: React.FC<ActivityListProps> = ({
    activities,
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
                    <Badge variant="primary" size="sm">
                        {totalCount} Total
                    </Badge>
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
                            title="Filtrer par statut"
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
                            title="Filtrer par module"
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
                    <div className="flex justify-center p-8">
                        <Avatar loading size="md" initials="" />
                    </div>
                ) : activities.length === 0 ? (
                    <EmptyState
                        icon={Puzzle}
                        title="Aucune activité"
                        description="Aucune activité trouvée."
                        size="sm"
                    />
                ) : (
                    activities.map((activity) => (
                        <div
                            key={activity.id}
                            className={clsx(
                                "w-full flex items-center gap-4 p-3 rounded-xl transition-all border text-left group relative hover:z-50",
                                selectedActivity?.id === activity.id
                                    ? "selected-state"
                                    : "bg-surface/50 border-transparent hover:border-white/10 hover:bg-surface"
                            )}
                        >
                            <div
                                className="flex-1 flex items-center gap-4 cursor-pointer min-w-0"
                                onClick={() => onSelect(activity)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(activity); }}
                            >
                                <Avatar
                                    size="md"
                                    icon={Puzzle}
                                    className={selectedActivity?.id === activity.id ? "bg-white/20" : "bg-background"}
                                />
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
                            </div>

                            <div className={clsx(
                                "flex gap-1 transition-opacity shrink-0",
                                selectedActivity?.id === activity.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            )}>
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onEdit(activity); }}
                                    className={clsx(
                                        "p-1.5 rounded-lg transition-colors",
                                        selectedActivity?.id === activity.id
                                            ? "text-text-dark/70 hover:text-text-dark hover:bg-text-dark/10"
                                            : "text-grey-medium hover:text-white hover:bg-white/10"
                                    )}
                                    title="Modifier"
                                >
                                    <Edit2 size={14} />
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onDeleteRequest(activity); }}
                                    className={clsx(
                                        "p-1.5 rounded-lg transition-colors text-danger/70 hover:text-danger hover:bg-danger/10",
                                        selectedActivity?.id === activity.id && "text-text-dark/70 hover:text-danger hover:bg-danger/10"
                                    )}
                                    title="Supprimer l'activité"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <ChevronRight size={16} className={clsx(
                                "transition-transform shrink-0",
                                selectedActivity?.id === activity.id ? "text-text-dark translate-x-1" : "text-grey-dark group-hover:translate-x-1"
                            )} />
                        </div>
                    ))
                )}
            </div>

            {/* Add Button */}
            <div className="p-4 border-t border-white/5 bg-surface/30">
                <Button
                    onClick={onOpenCreate}
                    variant="secondary"
                    className="w-full border-dashed"
                    icon={Plus}
                >
                    Nouvelle Activité
                </Button>
            </div>
        </div>
    );
};

export default ActivityList;
