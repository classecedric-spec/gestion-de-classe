import React, { useState, useRef, useLayoutEffect } from 'react';
import { Sparkles, Plus, Clock, SlidersHorizontal, Folder, Check, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';


// Modals
import AddModuleModal from '../../components/AddModuleModal';
import AddActivityModal from '../../features/activities/components/AddActivityModal';
import CreateActivitySeriesModal from '../../components/CreateActivitySeriesModal';

// Hooks
import { useNotifications } from './hooks/useNotifications';
import { useModuleManagement } from './hooks/useModuleManagement';
import { useActivityManagement } from './hooks/useActivityManagement';
import { useGroupSelection } from './hooks/useGroupSelection';
import { useProgressionGeneration } from './hooks/useProgressionGeneration';
import { useProgressionTracking } from './hooks/useProgressionTracking';

// Components
import ActivitiesTab from './components/ActivitiesTab';
import GroupsTab from './components/GroupsTab';
import ProgressionKanban from './components/ProgressionKanban';
import { Badge, Avatar, EmptyState, ConfirmModal, SearchBar, FilterSelect, CardInfo, CardList, CardTabs, ListItem } from '../../components/ui';

const Modules: React.FC = () => {
    // --- Height Synchronization ---
    const leftContentRef = useRef<HTMLDivElement>(null);
    const rightContentRef = useRef<HTMLDivElement>(null);
    const [headerHeight, setHeaderHeight] = useState<number | undefined>(undefined);
    const [showFilters, setShowFilters] = useState(false);

    // Notifications
    const { notification, showNotification, dismissNotification } = useNotifications();

    // Module Management
    const moduleHook = useModuleManagement();

    // Tabs & Modals
    const [detailTab, setDetailTab] = useState<'activities' | 'groups' | 'progression'>('activities');
    const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
    const [isAddActivityModalOpen, setIsAddActivityModalOpen] = useState<boolean>(false);
    const [isCreateSeriesModalOpen, setIsCreateSeriesModalOpen] = useState<boolean>(false);

    // Activity Management
    const activityHook = useActivityManagement(
        moduleHook.states.selectedModule,
        moduleHook.actions.setModules,
        moduleHook.actions.setSelectedModule
    );

    // Group Selection
    const groupHook = useGroupSelection(detailTab);

    // Progression Generation
    const progressionGenHook = useProgressionGeneration(
        showNotification,
        groupHook.actions.setSelectedGroups,
        setDetailTab as any
    );

    // Progression Tracking
    const progressionHook = useProgressionTracking(
        detailTab,
        activityHook.states.moduleActivities,
        moduleHook.states.selectedModule,
        moduleHook.actions.setModules,
        activityHook.actions.setStats
    );

    // --- Height Measure Effect ---
    useLayoutEffect(() => {
        const syncHeight = () => {
            const leftEl = leftContentRef.current;
            const rightEl = rightContentRef.current;

            if (leftEl) {
                const h1 = leftEl.getBoundingClientRect().height;
                const h2 = rightEl ? rightEl.getBoundingClientRect().height : 0;

                if (h2 > 0) {
                    const max = Math.max(h1, h2);
                    setHeaderHeight(max);
                } else {
                    setHeaderHeight(undefined);
                }
            }
        };

        syncHeight();
        const t = setTimeout(syncHeight, 50);
        const t2 = setTimeout(syncHeight, 300);
        return () => { clearTimeout(t); clearTimeout(t2); };
    }, [moduleHook.states.modules.length, moduleHook.states.selectedModule, moduleHook.states.searchTerm, moduleHook.states.statusFilter, showFilters]);

    // Handlers
    const handleModuleSelect = (module: any) => {
        moduleHook.actions.setSelectedModule(module);
        setDetailTab('activities');
    };

    const handleEdit = (module: any) => {
        moduleHook.actions.setModuleToEdit(module);
        setIsAddModalOpen(true);
    };

    const handleEditActivity = (activity: any) => {
        activityHook.actions.setActivityToEdit(activity);
        setIsAddActivityModalOpen(true);
    };

    const handleAddActivity = () => {
        activityHook.actions.setActivityToEdit(null);
        setIsAddActivityModalOpen(true);
    };

    const handleActivityAdded = async () => {
        await moduleHook.actions.fetchModules();
        if (moduleHook.states.selectedModule) {
            const updated = moduleHook.states.modules.find(m => m.id === moduleHook.states.selectedModule?.id);
            if (updated) moduleHook.actions.setSelectedModule(updated as any);
        }
    };

    return (
        <div className="flex h-full gap-6 animate-in fade-in duration-500 relative">
            {/* Left Sidebar Column */}
            <div className="w-1/4 flex flex-col gap-6 overflow-hidden">
                <CardInfo
                    ref={leftContentRef}
                    height={headerHeight}
                    contentClassName="space-y-5"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold text-text-main flex items-center gap-2">
                            <Folder className="text-primary" size={24} />
                            Liste des Modules
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
                                onChange={(e) => moduleHook.actions.setSearchTerm(e.target.value)}
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
                                        onChange={(e) => moduleHook.actions.setStatusFilter(e.target.value)}
                                        icon={Clock}
                                        className="text-[10px]"
                                    />
                                    <FilterSelect
                                        options={[
                                            { value: 'all', label: 'Branches: Tous' },
                                            ...moduleHook.states.availableBranches.map(b => ({ value: b.id, label: b.nom }))
                                        ]}
                                        value={moduleHook.states.branchFilter}
                                        onChange={(e) => moduleHook.actions.setBranchFilter(e.target.value)}
                                        icon={Folder}
                                        className="text-[10px]"
                                    />
                                    {moduleHook.states.branchFilter !== 'all' && (
                                        <FilterSelect
                                            options={[
                                                { value: 'all', label: 'Sous-Br.: Tous' },
                                                ...moduleHook.states.availableSubBranches.map(sb => ({ value: sb.id, label: sb.nom }))
                                            ]}
                                            value={moduleHook.states.subBranchFilter}
                                            onChange={(e) => moduleHook.actions.setSubBranchFilter(e.target.value)}
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
                    onAction={() => setIsAddModalOpen(true)}
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
                            {moduleHook.states.filteredModules.map((module) => {
                                const isExpired = module.date_fin && new Date(module.date_fin) < new Date();
                                return (
                                    <ListItem
                                        key={module.id}
                                        id={module.id}
                                        title={module.nom}
                                        subtitle={`${module.SousBranche?.Branche?.nom} - ${module.SousBranche?.nom}`}
                                        isSelected={moduleHook.states.selectedModule?.id === module.id}
                                        onClick={() => handleModuleSelect(module)}
                                        onEdit={() => handleEdit(module)}
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
                                            module.date_fin && (
                                                <Badge
                                                    key="date"
                                                    variant={isExpired ? (moduleHook.states.selectedModule?.id === module.id ? 'default' : 'danger') : 'default'}
                                                    size="xs"
                                                >
                                                    {new Date(module.date_fin).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                                                </Badge>
                                            ),
                                            <Badge
                                                key="progress"
                                                variant={isExpired ? (moduleHook.states.selectedModule?.id === module.id ? 'default' : 'danger') : 'success'}
                                                size="xs"
                                            >
                                                {module.percent || 0}%
                                            </Badge>
                                        ].filter(Boolean)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </CardList>
            </div>

            {/* Main Detail Area */}
            <div className="flex-1 flex flex-col gap-6 overflow-hidden relative">
                {!moduleHook.states.selectedModule ? (
                    <div className="flex-1 card-flat overflow-hidden">
                        <EmptyState
                            icon={Folder}
                            title="Sélectionnez un module"
                            description="Cliquez sur un module dans la liste pour afficher ses détails, activités et progression."
                            size="md"
                        />
                    </div>
                ) : (
                    <>
                        {/* Module Header Area */}
                        <CardInfo
                            ref={rightContentRef}
                            height={headerHeight}
                        >
                            <div className="flex gap-6 items-center">
                                <div className="w-20 h-20 rounded-2xl bg-surface border border-white/10 flex items-center justify-center text-primary shadow-xl shrink-0">
                                    <Folder size={40} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h1 className="text-3xl font-bold text-text-main truncate">{moduleHook.states.selectedModule.nom}</h1>
                                        <button
                                            onClick={() => moduleHook.actions.toggleStatus(moduleHook.states.selectedModule as any)}
                                            className="transition-transform active:scale-95 focus:outline-none"
                                        >
                                            <Badge
                                                variant={
                                                    moduleHook.states.selectedModule.statut === 'en_cours' ? 'success' :
                                                        moduleHook.states.selectedModule.statut === 'archive' ? 'danger' :
                                                            'primary'
                                                }
                                                size="xs"
                                                className="cursor-pointer hover:opacity-80"
                                            >
                                                {moduleHook.states.selectedModule.statut === 'en_cours' ? 'En cours' :
                                                    moduleHook.states.selectedModule.statut === 'archive' ? 'Archive' :
                                                        'En préparation'}
                                            </Badge>
                                        </button>
                                    </div>
                                    <p className="text-sm text-grey-medium">
                                        {moduleHook.states.selectedModule.SousBranche && (
                                            <>
                                                {moduleHook.states.selectedModule.SousBranche.Branche && `${moduleHook.states.selectedModule.SousBranche.Branche.nom} - `}
                                                {moduleHook.states.selectedModule.SousBranche.nom}
                                            </>
                                        )}
                                    </p>
                                </div>
                            </div>
                        </CardInfo>

                        {/* Content Section - Tabs */}
                        <CardTabs
                            tabs={[
                                { id: 'activities', label: 'Ateliers' },
                                { id: 'groups', label: 'Ciblage Groupes' },
                                { id: 'progression', label: 'Suivi & Progression' }
                            ]}
                            activeTab={detailTab}
                            onChange={setDetailTab as any}
                            actionLabel={detailTab === 'activities' ? "Ajouter une activité" : undefined}
                            onAction={detailTab === 'activities' ? handleAddActivity : undefined}
                            actionIcon={detailTab === 'activities' ? Plus : undefined}
                            secondaryActionLabel={detailTab === 'activities' ? "Créer une série" : undefined}
                            onSecondaryAction={detailTab === 'activities' ? () => setIsCreateSeriesModalOpen(true) : undefined}
                            secondaryActionIcon={detailTab === 'activities' ? Sparkles : undefined}
                        >
                            {detailTab === 'activities' ? (
                                <ActivitiesTab
                                    activities={activityHook.states.moduleActivities}
                                    onDragEnd={activityHook.actions.handleDragEnd}
                                    onEditActivity={handleEditActivity}
                                />
                            ) : detailTab === 'groups' ? (
                                <GroupsTab
                                    groups={groupHook.states.groups}
                                    selectedGroups={groupHook.states.selectedGroups}
                                    onToggleGroup={groupHook.actions.handleToggleGroup}
                                    onGenerate={() => progressionGenHook.actions.generateProgressions(
                                        groupHook.states.selectedGroups,
                                        moduleHook.states.selectedModule
                                    )}
                                    generatingProgressions={progressionGenHook.states.generatingProgressions}
                                    progress={progressionGenHook.states.progress}
                                    progressText={progressionGenHook.states.progressText}
                                />
                            ) : (
                                <ProgressionKanban
                                    activities={activityHook.states.moduleActivities}
                                    selectedActivity={progressionHook.states.selectedProgressionActivity}
                                    onSelectActivity={progressionHook.actions.setSelectedProgressionActivity}
                                    progressions={progressionHook.states.progressions}
                                    stats={activityHook.states.stats}
                                    loading={progressionHook.states.loadingProgressions}
                                    onDragEnd={progressionHook.actions.handleProgressionDragEnd}
                                />
                            )}
                        </CardTabs>
                    </>
                )}
            </div>

            {/* Add Module Modal */}
            <AddModuleModal
                isOpen={isAddModalOpen}
                onClose={() => { setIsAddModalOpen(false); moduleHook.actions.setModuleToEdit(null); }}
                onAdded={moduleHook.actions.handleCreated as any}
                moduleToEdit={moduleHook.states.moduleToEdit as any}
            />

            {/* Add Activity Modal */}
            <AddActivityModal
                isOpen={isAddActivityModalOpen}
                onClose={() => setIsAddActivityModalOpen(false)}
                onAdded={handleActivityAdded}
                activityToEdit={activityHook.states.activityToEdit as any}
                defaultModuleId={moduleHook.states.selectedModule?.id || ''}
                defaultModuleName={moduleHook.states.selectedModule?.titre || ''}
                nextOrder={activityHook.states.moduleActivities?.length > 0
                    ? Math.max(...activityHook.states.moduleActivities.map((a: any) => a.ordre || 0)) + 1
                    : 0}
            />

            {/* Create Activity Series Modal */}
            <CreateActivitySeriesModal
                isOpen={isCreateSeriesModalOpen}
                onClose={() => setIsCreateSeriesModalOpen(false)}
                onAdded={moduleHook.actions.fetchModules}
                moduleId={moduleHook.states.selectedModule?.id || ''}
            />

            {/* Floating Notification */}
            {notification && (
                <div className={clsx(
                    "fixed bottom-8 right-8 z-[200] flex items-center gap-4 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-10 duration-500 border backdrop-blur-md",
                    notification.type === 'success'
                        ? "bg-success/90 border-success/20 text-text-dark"
                        : "bg-danger/90 border-danger/20 text-white"
                )}>
                    <div className={clsx(
                        "w-8 h-8 rounded-full flex items-center justify-center shadow-inner",
                        notification.type === 'success' ? "bg-text-dark/10" : "bg-white/10"
                    )}>
                        {notification.type === 'success' ? <Check size={18} strokeWidth={3} /> : <AlertCircle size={18} strokeWidth={3} />}
                    </div>
                    <div className="flex flex-col">
                        <p className="font-black text-sm tracking-tight leading-tight uppercase">
                            {notification.type === 'success' ? 'Succès' : 'Attention'}
                        </p>
                        <p className="text-xs font-medium opacity-90">{notification.message || ''}</p>
                    </div>
                    <button
                        onClick={dismissNotification}
                        aria-label="Fermer la notification"
                        className="ml-4 p-1.5 rounded-lg hover:bg-black/10 transition-colors opacity-50 hover:opacity-100"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                isOpen={!!moduleHook.states.moduleToDelete}
                onClose={() => moduleHook.actions.setModuleToDelete(null)}
                onConfirm={moduleHook.actions.handleDelete}
                title="Supprimer le module ?"
                message={`Êtes-vous sûr de vouloir supprimer le module "${moduleHook.states.moduleToDelete?.nom}" ? Cette action est irréversible.`}
                confirmText="Supprimer"
                variant="danger"
            />
        </div>
    );
};

export default Modules;
