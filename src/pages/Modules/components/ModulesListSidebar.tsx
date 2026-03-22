import React from 'react';
import { Folder, SlidersHorizontal, Clock, Plus, Table, Users } from 'lucide-react';
import { CardInfo, SearchBar, FilterSelect, CardList, ListItem, EmptyState, Badge, Avatar } from '../../../core';
import clsx from 'clsx';

interface ModulesListSidebarProps {
    moduleHook: any; // Ideally typed from useModuleManagement
    showFilters: boolean;
    setShowFilters: (show: boolean) => void;
    onModuleSelect: (module: any) => void;
    onEdit: (module: any) => void;
    onAddClick: () => void;
    contentRef?: React.Ref<HTMLDivElement>;
    headerHeight?: number;
    onTableModeClick?: () => void;
}

export const ModulesListSidebar: React.FC<ModulesListSidebarProps> = ({
    moduleHook,
    showFilters,
    setShowFilters,
    onModuleSelect,
    onEdit,
    onAddClick,
    contentRef,
    headerHeight,
    onTableModeClick
}) => {
    return (
        <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
            <CardInfo
                ref={contentRef}
                height={headerHeight}
                contentClassName="space-y-5"
            >
                <div className="flex items-center justify-between">
                    <h2 className="text-cq-xl font-bold text-text-main flex items-center gap-2">
                        <Folder className="text-primary" size={24} />
                        Liste des Modules
                        {onTableModeClick && (
                            <button 
                                onClick={onTableModeClick}
                                className="ml-2 p-1.5 rounded-lg hover:bg-white/5 text-grey-medium hover:text-white transition-colors"
                                title="Vue Tableau Excel"
                            >
                                <Table size={18} />
                            </button>
                        )}
                    </h2>
                    <Badge variant="primary" size="xs">
                        {moduleHook.states.filteredModules.length} Modules
                    </Badge>
                </div>

                <div className="border-t border-white/10" />

                <div className="space-y-4">
                    <div className="flex gap-3">
                        <SearchBar
                            placeholder="Rechercher un module..."
                            value={moduleHook.states.searchTerm}
                            onChange={(e: any) => moduleHook.actions.setSearchTerm(e.target.value)}
                            iconColor="text-primary"
                        />

                        {/* Filters Toggle Button */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={clsx(
                                "p-2.5 rounded-xl border transition-all flex items-center justify-center shrink-0",
                                showFilters
                                    ? "bg-primary text-text-dark border-primary shadow-lg shadow-primary/20"
                                    : "bg-surface/50 border-white/10 text-grey-medium hover:text-white hover:border-white/20"
                            )}
                            title="Afficher les filtres"
                        >
                            <SlidersHorizontal size={20} />
                        </button>
                    </div>

                    {showFilters && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            {/* Filters Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <FilterSelect
                                    options={[
                                        { value: 'all', label: 'Statuts: Tous' },
                                        { value: 'en_preparation', label: 'En préparation' },
                                        { value: 'en_cours', label: 'En cours' },
                                        { value: 'archive', label: 'Archive' }
                                    ]}
                                    value={moduleHook.states.statusFilter}
                                    onChange={(e: any) => moduleHook.actions.setStatusFilter(e.target.value)}
                                    icon={Clock}
                                    className="text-[10px]"
                                />
                                <FilterSelect
                                    options={[
                                        { value: 'all', label: 'Branches: Tous' },
                                        ...moduleHook.states.availableBranches.map((b: any) => ({ value: b.id, label: b.nom }))
                                    ]}
                                    value={moduleHook.states.branchFilter}
                                    onChange={(e: any) => moduleHook.actions.setBranchFilter(e.target.value)}
                                    icon={Folder}
                                    className="text-[10px]"
                                />
                                {moduleHook.states.branchFilter !== 'all' && (
                                    <FilterSelect
                                        options={[
                                            { value: 'all', label: 'Sous-Br.: Tous' },
                                            ...moduleHook.states.availableSubBranches.map((sb: any) => ({ value: sb.id, label: sb.nom }))
                                        ]}
                                        value={moduleHook.states.subBranchFilter}
                                        onChange={(e: any) => moduleHook.actions.setSubBranchFilter(e.target.value)}
                                        icon={Folder}
                                        className="text-[10px] col-span-2 animate-in slide-in-from-left-2 duration-200"
                                    />
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </CardInfo>

            <CardList
                actionLabel="Nouveau Module"
                onAction={onAddClick}
                actionIcon={Plus}
            >
                {moduleHook.states.loading && moduleHook.states.filteredModules.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-12 gap-3">
                        <Avatar size="lg" loading initials="" />
                        <p className="text-grey-medium animate-pulse text-sm">Chargement...</p>
                    </div>
                ) : moduleHook.states.filteredModules.length === 0 ? (
                    <EmptyState
                        icon={Folder}
                        title="Aucun module"
                        description={moduleHook.states.searchTerm ? "Aucun module ne correspond à votre recherche." : "Commencez par créer votre premier module."}
                        size="sm"
                    />
                ) : (
                    <div className="space-y-1">
                        {moduleHook.states.filteredModules.map((module: any) => {
                            const isExpired = module.date_fin && new Date(module.date_fin) < new Date();
                            return (
                                <ListItem
                                    key={module.id}
                                    id={module.id}
                                    title={module.nom}
                                    subtitle={`${module.SousBranche?.Branche?.nom} - ${module.SousBranche?.nom}`}
                                    isSelected={moduleHook.states.selectedModule?.id === module.id}
                                    onClick={() => onModuleSelect(module)}
                                    onEdit={() => onEdit(module)}
                                    onDelete={() => moduleHook.actions.setModuleToDelete(module)}
                                    deleteTitle="Supprimer le module"
                                    className={clsx(isExpired && moduleHook.states.selectedModule?.id !== module.id && "border-danger/30")}
                                    avatar={{
                                        icon: Folder,
                                        className: clsx(
                                            moduleHook.states.selectedModule?.id === module.id
                                                ? "bg-white/20 text-inherit"
                                                : "bg-background text-primary"
                                        )
                                    }}
                                    badges={[
                                        <div key="left-badges" className="flex gap-1.5 flex-1 items-center">
                                            <Badge
                                                key="status"
                                                variant={
                                                    module.statut === 'en_cours' ? 'success' :
                                                        module.statut === 'archive' ? 'danger' :
                                                            'warning'
                                                }
                                                size="xs"
                                            >
                                                {module.statut === 'en_cours' ? 'En cours' :
                                                    module.statut === 'archive' ? 'Archi' :
                                                        'Prep'}
                                            </Badge>
                                            {module.date_fin && (
                                                <Badge
                                                    key="date"
                                                    variant={isExpired ? 'danger' : 'default'}
                                                    size="xs"
                                                >
                                                    {new Date(module.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                </Badge>
                                            )}
                                        </div>,
                                        <div key="right-badges" className="flex gap-1.5 items-center shrink-0">
                                            <Badge
                                                key="progress"
                                                variant={
                                                    (module.percent || 0) < 50 ? 'danger' :
                                                        (module.percent || 0) < 75 ? 'warning' :
                                                            'success'
                                                }
                                                size="xs"
                                            >
                                                {module.percent || 0}%
                                            </Badge>
                                            <Badge
                                                key="students"
                                                variant="danger"
                                                size="xs"
                                                className="px-1.5 flex items-center bg-danger/80 text-white border-danger/20"
                                            >
                                                <div className="flex items-center gap-1 leading-none">
                                                    {module.studentCount || 0}
                                                    <Users size={10} strokeWidth={3} className="shrink-0" />
                                                </div>
                                            </Badge>
                                        </div>
                                    ].filter(Boolean)}
                                />
                            );
                        })}
                    </div>
                )}
            </CardList>
        </div>
    );
};
